import { prisma } from '@/lib/db';
import { EmbeddingService, SimilarityAlgorithm } from '@/lib/embeddings';

export interface ClusterOptions {
  algorithm: 'kmeans' | 'hierarchical' | 'dbscan';
  numClusters?: number; // For k-means
  threshold?: number; // For hierarchical and DBSCAN
  maxIterations?: number; // For k-means
  minPoints?: number; // For DBSCAN
  distance?: SimilarityAlgorithm;
}

export interface Cluster {
  id: string;
  name: string;
  description?: string;
  centroid: number[];
  items: Array<{
    itemId: string;
    similarity: number;
  }>;
  algorithm: string;
  threshold: number;
}

export interface ClusterAnalysis {
  clusters: Cluster[];
  silhouetteScore?: number;
  inertia?: number;
  outliers: string[];
  summary: {
    totalClusters: number;
    totalItems: number;
    averageClusterSize: number;
    largestCluster: number;
    smallestCluster: number;
  };
}

export class SemanticClusteringService {
  private embeddingService: EmbeddingService;

  constructor(userId?: string) {
    this.embeddingService = new EmbeddingService(userId);
  }

  /**
   * Perform clustering analysis on user's items
   */
  async clusterItems(
    userId: string,
    options: ClusterOptions
  ): Promise<ClusterAnalysis> {
    // Get all embeddings for the user
    const embeddings = await this.getUserEmbeddings(userId);
    
    if (embeddings.length < 2) {
      throw new Error('Need at least 2 items with embeddings to perform clustering');
    }

    let clusters: Cluster[];
    let outliers: string[] = [];

    switch (options.algorithm) {
      case 'kmeans':
        clusters = await this.performKMeansClustering(embeddings, options);
        break;
      case 'hierarchical':
        clusters = await this.performHierarchicalClustering(embeddings, options);
        break;
      case 'dbscan':
        const result = await this.performDBSCANClustering(embeddings, options);
        clusters = result.clusters;
        outliers = result.outliers;
        break;
      default:
        throw new Error(`Unsupported clustering algorithm: ${options.algorithm}`);
    }

    // Calculate quality metrics
    const silhouetteScore = this.calculateSilhouetteScore(embeddings, clusters);
    const inertia = options.algorithm === 'kmeans' ? this.calculateInertia(embeddings, clusters) : undefined;

    // Generate summary
    const summary = this.generateClusterSummary(clusters);

    // Store clusters in database
    await this.storeClusters(clusters);

    return {
      clusters,
      silhouetteScore,
      inertia,
      outliers,
      summary,
    };
  }

  /**
   * Get embeddings for user's items
   */
  private async getUserEmbeddings(userId: string): Promise<Array<{
    itemId: string;
    embedding: number[];
    item: { name: string; type: string; content: string };
  }>> {
    const embeddings = await prisma.itemEmbedding.findMany({
      where: {
        item: { userId },
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            type: true,
            content: true,
          },
        },
      },
    });

    return embeddings.map(e => ({
      itemId: e.itemId,
      embedding: JSON.parse(e.embedding),
      item: {
        name: e.item.name,
        type: e.item.type,
        content: e.item.content,
      },
    }));
  }

  /**
   * Perform K-Means clustering
   */
  private async performKMeansClustering(
    embeddings: Array<{ itemId: string; embedding: number[]; item: any }>,
    options: ClusterOptions
  ): Promise<Cluster[]> {
    const k = options.numClusters || Math.min(8, Math.ceil(Math.sqrt(embeddings.length / 2)));
    const maxIterations = options.maxIterations || 100;
    const vectors = embeddings.map(e => e.embedding);

    // Initialize centroids randomly
    let centroids = this.initializeRandomCentroids(vectors, k);
    let assignments = new Array(embeddings.length).fill(0);
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const newAssignments = new Array(embeddings.length);
      
      // Assign points to nearest centroid
      for (let i = 0; i < vectors.length; i++) {
        let minDistance = Infinity;
        let nearestCentroid = 0;
        
        for (let j = 0; j < centroids.length; j++) {
          const distance = this.calculateDistance(vectors[i], centroids[j], options.distance || 'cosine');
          if (distance < minDistance) {
            minDistance = distance;
            nearestCentroid = j;
          }
        }
        
        newAssignments[i] = nearestCentroid;
      }
      
      // Check for convergence
      if (this.arraysEqual(assignments, newAssignments)) {
        break;
      }
      
      assignments = newAssignments;
      
      // Update centroids
      centroids = this.updateCentroids(vectors, assignments, k);
    }

    // Convert to cluster format
    const clusters: Cluster[] = [];
    for (let i = 0; i < k; i++) {
      const clusterItems = embeddings
        .map((e, idx) => ({ ...e, assignment: assignments[idx] }))
        .filter(e => e.assignment === i)
        .map(e => ({
          itemId: e.itemId,
          similarity: 1 - this.calculateDistance(e.embedding, centroids[i], options.distance || 'cosine'),
        }));

      if (clusterItems.length > 0) {
        clusters.push({
          id: `kmeans-${i}`,
          name: await this.generateClusterName(clusterItems),
          centroid: centroids[i],
          items: clusterItems,
          algorithm: 'kmeans',
          threshold: 0,
        });
      }
    }

    return clusters;
  }

  /**
   * Perform hierarchical clustering
   */
  private async performHierarchicalClustering(
    embeddings: Array<{ itemId: string; embedding: number[]; item: any }>,
    options: ClusterOptions
  ): Promise<Cluster[]> {
    const threshold = options.threshold || 0.7;
    const vectors = embeddings.map(e => e.embedding);
    
    // Start with each point as its own cluster
    let clusters = embeddings.map((e, i) => ({
      items: [i],
      centroid: [...e.embedding],
    }));

    // Merge clusters until threshold is reached
    while (clusters.length > 1) {
      let minDistance = Infinity;
      let mergeI = -1;
      let mergeJ = -1;

      // Find closest pair of clusters
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const distance = this.calculateDistance(
            clusters[i].centroid,
            clusters[j].centroid,
            options.distance || 'cosine'
          );

          if (distance < minDistance) {
            minDistance = distance;
            mergeI = i;
            mergeJ = j;
          }
        }
      }

      // Stop if minimum distance exceeds threshold
      if (minDistance > (1 - threshold)) {
        break;
      }

      // Merge the closest clusters
      const merged = {
        items: [...clusters[mergeI].items, ...clusters[mergeJ].items],
        centroid: this.calculateCentroid([
          ...clusters[mergeI].items.map(idx => vectors[idx]),
          ...clusters[mergeJ].items.map(idx => vectors[idx]),
        ]),
      };

      clusters = [
        ...clusters.slice(0, mergeI),
        ...clusters.slice(mergeI + 1, mergeJ),
        ...clusters.slice(mergeJ + 1),
        merged,
      ];
    }

    // Convert to cluster format
    const result: Cluster[] = [];
    for (let i = 0; i < clusters.length; i++) {
      const clusterItems = clusters[i].items.map(idx => ({
        itemId: embeddings[idx].itemId,
        similarity: 1 - this.calculateDistance(
          embeddings[idx].embedding,
          clusters[i].centroid,
          options.distance || 'cosine'
        ),
      }));

      result.push({
        id: `hierarchical-${i}`,
        name: await this.generateClusterName(clusterItems),
        centroid: clusters[i].centroid,
        items: clusterItems,
        algorithm: 'hierarchical',
        threshold,
      });
    }

    return result;
  }

  /**
   * Perform DBSCAN clustering
   */
  private async performDBSCANClustering(
    embeddings: Array<{ itemId: string; embedding: number[]; item: any }>,
    options: ClusterOptions
  ): Promise<{ clusters: Cluster[]; outliers: string[] }> {
    const eps = 1 - (options.threshold || 0.7); // Convert similarity to distance
    const minPts = options.minPoints || Math.max(2, Math.ceil(embeddings.length * 0.05));
    
    const vectors = embeddings.map(e => e.embedding);
    const visited = new Array(vectors.length).fill(false);
    const clustered = new Array(vectors.length).fill(false);
    const clusters: number[][] = [];
    const noise: number[] = [];

    for (let i = 0; i < vectors.length; i++) {
      if (visited[i]) continue;
      
      visited[i] = true;
      const neighbors = this.regionQuery(vectors, i, eps, options.distance || 'cosine');
      
      if (neighbors.length < minPts) {
        noise.push(i);
      } else {
        const cluster: number[] = [];
        this.expandCluster(vectors, i, neighbors, cluster, visited, clustered, eps, minPts, options.distance || 'cosine');
        clusters.push(cluster);
      }
    }

    // Convert to cluster format
    const result: Cluster[] = [];
    for (let i = 0; i < clusters.length; i++) {
      const clusterItems = clusters[i].map(idx => ({
        itemId: embeddings[idx].itemId,
        similarity: 1, // DBSCAN doesn't provide similarity scores
      }));

      const centroid = this.calculateCentroid(clusters[i].map(idx => vectors[idx]));

      result.push({
        id: `dbscan-${i}`,
        name: await this.generateClusterName(clusterItems),
        centroid,
        items: clusterItems,
        algorithm: 'dbscan',
        threshold: options.threshold || 0.7,
      });
    }

    const outliers = noise.map(idx => embeddings[idx].itemId);

    return { clusters: result, outliers };
  }

  /**
   * Helper methods for clustering algorithms
   */
  private initializeRandomCentroids(vectors: number[][], k: number): number[][] {
    const centroids: number[][] = [];
    const used = new Set<number>();
    
    while (centroids.length < k && centroids.length < vectors.length) {
      const idx = Math.floor(Math.random() * vectors.length);
      if (!used.has(idx)) {
        centroids.push([...vectors[idx]]);
        used.add(idx);
      }
    }
    
    return centroids;
  }

  private calculateDistance(vec1: number[], vec2: number[], algorithm: SimilarityAlgorithm): number {
    const similarity = this.embeddingService.calculateSimilarity(vec1, vec2, algorithm);
    return algorithm === 'cosine' ? 1 - similarity : similarity;
  }

  private updateCentroids(vectors: number[][], assignments: number[], k: number): number[][] {
    const centroids: number[][] = [];
    
    for (let i = 0; i < k; i++) {
      const clusterVectors = vectors.filter((_, idx) => assignments[idx] === i);
      
      if (clusterVectors.length === 0) {
        // Use random vector if cluster is empty
        centroids.push([...vectors[Math.floor(Math.random() * vectors.length)]]);
      } else {
        centroids.push(this.calculateCentroid(clusterVectors));
      }
    }
    
    return centroids;
  }

  private calculateCentroid(vectors: number[][]): number[] {
    if (vectors.length === 0) return [];
    
    const dimensions = vectors[0].length;
    const centroid = new Array(dimensions).fill(0);
    
    for (const vector of vectors) {
      for (let i = 0; i < dimensions; i++) {
        centroid[i] += vector[i];
      }
    }
    
    for (let i = 0; i < dimensions; i++) {
      centroid[i] /= vectors.length;
    }
    
    return centroid;
  }

  private arraysEqual(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }

  private regionQuery(vectors: number[][], pointIdx: number, eps: number, algorithm: SimilarityAlgorithm): number[] {
    const neighbors: number[] = [];
    
    for (let i = 0; i < vectors.length; i++) {
      if (this.calculateDistance(vectors[pointIdx], vectors[i], algorithm) <= eps) {
        neighbors.push(i);
      }
    }
    
    return neighbors;
  }

  private expandCluster(
    vectors: number[][],
    pointIdx: number,
    neighbors: number[],
    cluster: number[],
    visited: boolean[],
    clustered: boolean[],
    eps: number,
    minPts: number,
    algorithm: SimilarityAlgorithm
  ): void {
    cluster.push(pointIdx);
    clustered[pointIdx] = true;
    
    for (let i = 0; i < neighbors.length; i++) {
      const neighborIdx = neighbors[i];
      
      if (!visited[neighborIdx]) {
        visited[neighborIdx] = true;
        const newNeighbors = this.regionQuery(vectors, neighborIdx, eps, algorithm);
        
        if (newNeighbors.length >= minPts) {
          neighbors.push(...newNeighbors);
        }
      }
      
      if (!clustered[neighborIdx]) {
        cluster.push(neighborIdx);
        clustered[neighborIdx] = true;
      }
    }
  }

  /**
   * Generate a descriptive name for a cluster
   */
  private async generateClusterName(clusterItems: Array<{ itemId: string; similarity: number }>): Promise<string> {
    try {
      // Get item details for naming
      const items = await prisma.item.findMany({
        where: {
          id: { in: clusterItems.map(c => c.itemId) },
        },
        select: {
          type: true,
          name: true,
        },
      });

      // Analyze types and names to generate a meaningful cluster name
      const types = items.map(i => i.type);
      const mostCommonType = this.getMostCommon(types);
      
      const names = items.map(i => i.name.toLowerCase());
      const keywords = this.extractKeywords(names);
      const topKeyword = keywords[0];

      if (topKeyword && mostCommonType) {
        return `${mostCommonType} - ${topKeyword}`;
      } else if (mostCommonType) {
        return `${mostCommonType} cluster`;
      } else {
        return `Mixed content cluster`;
      }
    } catch (error) {
      return `Cluster ${Date.now()}`;
    }
  }

  private getMostCommon<T>(arr: T[]): T | null {
    if (arr.length === 0) return null;
    
    const counts = new Map<T, number>();
    for (const item of arr) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }
    
    return Array.from(counts.entries()).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }

  private extractKeywords(names: string[]): string[] {
    const words = names.join(' ').split(/\s+/);
    const wordCounts = new Map<string, number>();
    
    for (const word of words) {
      if (word.length > 3) { // Filter out short words
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }
    
    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word)
      .slice(0, 5);
  }

  /**
   * Calculate silhouette score for clustering quality
   */
  private calculateSilhouetteScore(
    embeddings: Array<{ itemId: string; embedding: number[] }>,
    clusters: Cluster[]
  ): number {
    if (clusters.length < 2) return 0;

    let totalScore = 0;
    let totalPoints = 0;

    for (const cluster of clusters) {
      for (const item of cluster.items) {
        const embedding = embeddings.find(e => e.itemId === item.itemId)?.embedding;
        if (!embedding) continue;

        // Calculate average intra-cluster distance
        const intraDistances: number[] = [];
        for (const otherItem of cluster.items) {
          if (otherItem.itemId !== item.itemId) {
            const otherEmbedding = embeddings.find(e => e.itemId === otherItem.itemId)?.embedding;
            if (otherEmbedding) {
              intraDistances.push(this.calculateDistance(embedding, otherEmbedding, 'cosine'));
            }
          }
        }
        const avgIntraDistance = intraDistances.length > 0 
          ? intraDistances.reduce((a, b) => a + b, 0) / intraDistances.length 
          : 0;

        // Calculate minimum average inter-cluster distance
        let minInterDistance = Infinity;
        for (const otherCluster of clusters) {
          if (otherCluster.id !== cluster.id) {
            const interDistances: number[] = [];
            for (const otherItem of otherCluster.items) {
              const otherEmbedding = embeddings.find(e => e.itemId === otherItem.itemId)?.embedding;
              if (otherEmbedding) {
                interDistances.push(this.calculateDistance(embedding, otherEmbedding, 'cosine'));
              }
            }
            if (interDistances.length > 0) {
              const avgInterDistance = interDistances.reduce((a, b) => a + b, 0) / interDistances.length;
              minInterDistance = Math.min(minInterDistance, avgInterDistance);
            }
          }
        }

        // Calculate silhouette score for this point
        if (minInterDistance !== Infinity) {
          const silhouette = (minInterDistance - avgIntraDistance) / Math.max(minInterDistance, avgIntraDistance);
          totalScore += silhouette;
          totalPoints++;
        }
      }
    }

    return totalPoints > 0 ? totalScore / totalPoints : 0;
  }

  /**
   * Calculate inertia (within-cluster sum of squares) for k-means
   */
  private calculateInertia(
    embeddings: Array<{ itemId: string; embedding: number[] }>,
    clusters: Cluster[]
  ): number {
    let inertia = 0;

    for (const cluster of clusters) {
      for (const item of cluster.items) {
        const embedding = embeddings.find(e => e.itemId === item.itemId)?.embedding;
        if (embedding) {
          const distance = this.calculateDistance(embedding, cluster.centroid, 'cosine');
          inertia += distance * distance;
        }
      }
    }

    return inertia;
  }

  /**
   * Generate cluster summary statistics
   */
  private generateClusterSummary(clusters: Cluster[]) {
    const clusterSizes = clusters.map(c => c.items.length);
    
    return {
      totalClusters: clusters.length,
      totalItems: clusterSizes.reduce((a, b) => a + b, 0),
      averageClusterSize: clusterSizes.length > 0 ? clusterSizes.reduce((a, b) => a + b, 0) / clusterSizes.length : 0,
      largestCluster: Math.max(...clusterSizes, 0),
      smallestCluster: Math.min(...clusterSizes, 0),
    };
  }

  /**
   * Store clusters in database
   */
  private async storeClusters(clusters: Cluster[]): Promise<void> {
    try {
      for (const cluster of clusters) {
        const dbCluster = await prisma.semanticCluster.create({
          data: {
            name: cluster.name,
            description: cluster.description,
            centroid: JSON.stringify(cluster.centroid),
            algorithm: cluster.algorithm,
            threshold: cluster.threshold,
            itemCount: cluster.items.length,
          },
        });

        // Store cluster items
        for (const item of cluster.items) {
          await prisma.semanticClusterItem.create({
            data: {
              clusterId: dbCluster.id,
              itemId: item.itemId,
              similarity: item.similarity,
            },
          });
        }
      }
    } catch (error) {
      console.error('Error storing clusters:', error);
      throw error;
    }
  }

  /**
   * Get existing clusters for user
   */
  async getUserClusters(userId: string): Promise<Cluster[]> {
    try {
      const clusters = await prisma.semanticCluster.findMany({
        include: {
          items: {
            include: {
              item: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  userId: true,
                },
              },
            },
          },
        },
        where: {
          items: {
            some: {
              item: {
                userId,
              },
            },
          },
        },
      });

      return clusters.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description || undefined,
        centroid: JSON.parse(c.centroid),
        items: c.items.map(i => ({
          itemId: i.itemId,
          similarity: i.similarity,
        })),
        algorithm: c.algorithm,
        threshold: c.threshold,
      }));
    } catch (error) {
      console.error('Error getting user clusters:', error);
      throw error;
    }
  }
}

export default SemanticClusteringService;