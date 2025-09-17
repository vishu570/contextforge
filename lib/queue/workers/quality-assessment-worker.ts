// @ts-nocheck
import { BaseWorker } from './base-worker';
import { JobType, JobResult, JobProgress } from '../types';
import { z } from 'zod';
import { prisma } from '../../db';

const QualityAssessmentJobDataSchema = z.object({
  userId: z.string(),
  itemId: z.string().optional(),
  content: z.string(),
  type: z.string(),
  format: z.string(),
  metadata: z.record(z.any()).optional(),
});

type QualityAssessmentJobData = z.infer<typeof QualityAssessmentJobDataSchema>;

interface QualityMetrics {
  clarity: number;
  completeness: number;
  specificity: number;
  consistency: number;
  usability: number;
  overall: number;
}

interface QualityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  suggestion: string;
  lineNumber?: number;
}

export class QualityAssessmentWorker extends BaseWorker<QualityAssessmentJobData> {
  constructor() {
    super(JobType.QUALITY_ASSESSMENT, 2); // Allow 2 concurrent assessments
  }

  async process(
    data: QualityAssessmentJobData,
    progress: (progress: JobProgress) => Promise<void>
  ): Promise<JobResult> {
    const validatedData = QualityAssessmentJobDataSchema.parse(data);

    await progress({
      percentage: 10,
      message: 'Starting quality assessment...',
    });

    try {
      // Step 1: Analyze content structure
      await progress({
        percentage: 20,
        message: 'Analyzing content structure...',
      });
      
      const structureAnalysis = this.analyzeStructure(validatedData.content);

      // Step 2: Assess readability
      await progress({
        percentage: 35,
        message: 'Assessing readability...',
      });
      
      const readabilityMetrics = this.assessReadability(validatedData.content);

      // Step 3: Check completeness
      await progress({
        percentage: 50,
        message: 'Checking completeness...',
      });
      
      const completenessAnalysis = this.assessCompleteness(
        validatedData.content,
        validatedData.type
      );

      // Step 4: Validate consistency
      await progress({
        percentage: 65,
        message: 'Validating consistency...',
      });
      
      const consistencyCheck = this.checkConsistency(validatedData.content);

      // Step 5: Assess usability
      await progress({
        percentage: 80,
        message: 'Assessing usability...',
      });
      
      const usabilityMetrics = this.assessUsability(
        validatedData.content,
        validatedData.type
      );

      // Step 6: Identify issues and suggestions
      await progress({
        percentage: 90,
        message: 'Identifying improvement opportunities...',
      });
      
      const issues = this.identifyIssues({
        structure: structureAnalysis,
        readability: readabilityMetrics,
        completeness: completenessAnalysis,
        consistency: consistencyCheck,
        usability: usabilityMetrics,
      });

      // Step 7: Calculate overall quality metrics
      const qualityMetrics = this.calculateQualityMetrics({
        structure: structureAnalysis,
        readability: readabilityMetrics,
        completeness: completenessAnalysis,
        consistency: consistencyCheck,
        usability: usabilityMetrics,
      });

      // Step 8: Generate improvement suggestions
      const suggestions = this.generateSuggestions(issues, qualityMetrics);

      await progress({
        percentage: 100,
        message: 'Quality assessment completed',
      });

      const result = {
        qualityMetrics,
        issues,
        suggestions,
        analysis: {
          structure: structureAnalysis,
          readability: readabilityMetrics,
          completeness: completenessAnalysis,
          consistency: consistencyCheck,
          usability: usabilityMetrics,
        },
        recommendations: this.generateRecommendations(qualityMetrics, issues),
      };

      // Save assessment if itemId provided
      if (validatedData.itemId) {
        await this.saveQualityAssessment(validatedData.itemId, result);
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new Error(`Quality assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private analyzeStructure(content: string): any {
    const lines = content.split('\n');
    const structure = {
      lineCount: lines.length,
      hasHeaders: /^#{1,6}\s/.test(content),
      hasBulletPoints: /^[-*+]\s/.test(content),
      hasNumberedList: /^\d+\.\s/.test(content),
      hasCodeBlocks: /```[\s\S]*?```/.test(content),
      hasVariables: /\{\{.*?\}\}|\$\{.*?\}/.test(content),
      hasSections: this.countSections(content),
      indentationConsistent: this.checkIndentation(lines),
      avgLineLength: lines.reduce((sum, line) => sum + line.length, 0) / lines.length,
    };

    return structure;
  }

  private countSections(content: string): number {
    const sectionMarkers = [
      /^#{1,6}\s/gm, // Markdown headers
      /^[A-Z][A-Z\s]+:$/gm, // All caps section headers
      /^\d+\.\s/gm, // Numbered sections
    ];

    let sectionCount = 0;
    sectionMarkers.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) sectionCount += matches.length;
    });

    return sectionCount;
  }

  private checkIndentation(lines: string[]): boolean {
    const indentationPattern = /^(\s*)/;
    const indentations = lines
      .filter(line => line.trim().length > 0)
      .map(line => {
        const match = line.match(indentationPattern);
        return match ? match[1].length : 0;
      });

    // Check if indentation is consistent (multiples of 2 or 4)
    const isConsistent = indentations.every(indent => 
      indent % 2 === 0 || indent % 4 === 0
    );

    return isConsistent;
  }

  private assessReadability(content: string): any {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    
    const avgSentenceLength = sentences.length > 0 
      ? words.length / sentences.length 
      : 0;
    
    const avgWordLength = words.length > 0
      ? words.reduce((sum, word) => sum + word.length, 0) / words.length
      : 0;

    // Calculate Flesch Reading Ease (simplified)
    const fleschScore = Math.max(0, Math.min(100, 
      206.835 - (1.015 * avgSentenceLength) - (84.6 * avgWordLength / 4.7)
    ));

    return {
      avgSentenceLength,
      avgWordLength,
      fleschScore,
      readabilityLevel: this.getReadabilityLevel(fleschScore),
      complexWords: this.countComplexWords(words),
      jargonLevel: this.assessJargon(words),
    };
  }

  private getReadabilityLevel(fleschScore: number): string {
    if (fleschScore >= 90) return 'Very Easy';
    if (fleschScore >= 80) return 'Easy';
    if (fleschScore >= 70) return 'Fairly Easy';
    if (fleschScore >= 60) return 'Standard';
    if (fleschScore >= 50) return 'Fairly Difficult';
    if (fleschScore >= 30) return 'Difficult';
    return 'Very Difficult';
  }

  private countComplexWords(words: string[]): number {
    return words.filter(word => 
      word.length > 6 && 
      !/^\d+$/.test(word) && // Not a number
      !word.includes('.')    // Not a domain/file
    ).length;
  }

  private assessJargon(words: string[]): 'low' | 'medium' | 'high' {
    const jargonWords = [
      'api', 'endpoint', 'authentication', 'authorization', 'middleware',
      'scalability', 'optimization', 'implementation', 'configuration',
      'deployment', 'infrastructure', 'microservices', 'architecture'
    ];

    const jargonCount = words.filter(word => 
      jargonWords.includes(word.toLowerCase())
    ).length;

    const jargonRatio = jargonCount / words.length;

    if (jargonRatio > 0.1) return 'high';
    if (jargonRatio > 0.05) return 'medium';
    return 'low';
  }

  private assessCompleteness(content: string, type: string): any {
    const completenessChecks = {
      hasTitle: /^#{1,3}\s/.test(content) || /^[A-Z][A-Z\s]+:?$/m.test(content),
      hasDescription: content.length > 100,
      hasExamples: /example|for instance|such as|e\.g\./i.test(content),
      hasInstructions: /\b(step|instruction|do|should|must|will)\b/i.test(content),
      hasConstraints: /\b(limit|maximum|minimum|no more than|at least)\b/i.test(content),
      hasVariables: /\{\{.*?\}\}|\$\{.*?\}/.test(content),
    };

    // Type-specific completeness checks
    switch (type) {
      case 'prompt':
        completenessChecks['hasSystemMessage'] = /system:|role:.*system/i.test(content);
        completenessChecks['hasUserMessage'] = /user:|role:.*user/i.test(content);
        break;
      case 'agent':
        completenessChecks['hasPersonality'] = /personality|character|tone|style/i.test(content);
        completenessChecks['hasRole'] = /you are|act as|your role/i.test(content);
        break;
      case 'template':
        completenessChecks['hasPlaceholders'] = /\{\{.*?\}\}|\$\{.*?\}|\[.*?\]/.test(content);
        break;
    }

    const completedChecks = Object.values(completenessChecks).filter(Boolean).length;
    const totalChecks = Object.keys(completenessChecks).length;
    const completenessScore = completedChecks / totalChecks;

    return {
      checks: completenessChecks,
      score: completenessScore,
      missingElements: Object.entries(completenessChecks)
        .filter(([_, passed]) => !passed)
        .map(([element, _]) => element),
    };
  }

  private checkConsistency(content: string): any {
    const consistencyIssues: string[] = [];
    
    // Check formatting consistency
    const bullets = content.match(/^[-*+]\s/gm);
    if (bullets && new Set(bullets.map(b => b.charAt(0))).size > 1) {
      consistencyIssues.push('Mixed bullet point styles');
    }

    // Check header consistency
    const headers = content.match(/^#{1,6}\s/gm);
    if (headers) {
      const headerLevels = headers.map(h => h.length - 1);
      if (headerLevels.some((level, i) => i > 0 && level > headerLevels[i-1] + 1)) {
        consistencyIssues.push('Inconsistent header hierarchy');
      }
    }

    // Check variable naming consistency
    const variables = content.match(/\{\{(.*?)\}\}/g);
    if (variables && variables.length > 1) {
      const namingStyles = variables.map(v => {
        const name = v.slice(2, -2);
        if (name.includes('_')) return 'snake_case';
        if (name.includes('-')) return 'kebab-case';
        if (/[A-Z]/.test(name)) return 'camelCase';
        return 'lowercase';
      });
      
      if (new Set(namingStyles).size > 1) {
        consistencyIssues.push('Inconsistent variable naming');
      }
    }

    return {
      score: Math.max(0, 1 - (consistencyIssues.length * 0.2)),
      issues: consistencyIssues,
    };
  }

  private assessUsability(content: string, type: string): any {
    const usabilityFactors = {
      hasExamples: /example|for instance|such as|e\.g\./i.test(content),
      hasClearInstructions: /\b(step|instruction|follow|complete)\b/i.test(content),
      hasErrorHandling: /error|fail|exception|try|catch/i.test(content),
      hasValidation: /validate|check|verify|ensure/i.test(content),
      isModular: this.checkModularity(content),
      isReusable: this.checkReusability(content, type),
    };

    const usabilityScore = Object.values(usabilityFactors).filter(Boolean).length / Object.keys(usabilityFactors).length;

    return {
      score: usabilityScore,
      factors: usabilityFactors,
      suggestions: this.generateUsabilitySuggestions(usabilityFactors),
    };
  }

  private checkModularity(content: string): boolean {
    // Check if content is broken into logical sections
    const sectionCount = this.countSections(content);
    const contentLength = content.length;
    
    return sectionCount > 1 && contentLength / sectionCount < 500;
  }

  private checkReusability(content: string, type: string): boolean {
    // Check for reusable patterns
    const hasVariables = /\{\{.*?\}\}|\$\{.*?\}/.test(content);
    const hasParameters = /\[.*?\]|\<.*?\>/.test(content);
    const isGeneric = !/specific|particular|exact|precisely/.test(content.toLowerCase());
    
    return hasVariables || hasParameters || (isGeneric && type === 'template');
  }

  private generateUsabilitySuggestions(factors: any): string[] {
    const suggestions: string[] = [];
    
    if (!factors.hasExamples) {
      suggestions.push('Add examples to illustrate usage');
    }
    if (!factors.hasClearInstructions) {
      suggestions.push('Provide clearer step-by-step instructions');
    }
    if (!factors.hasErrorHandling) {
      suggestions.push('Include error handling guidance');
    }
    if (!factors.isModular) {
      suggestions.push('Break content into smaller, focused sections');
    }
    if (!factors.isReusable) {
      suggestions.push('Make content more reusable with variables or parameters');
    }
    
    return suggestions;
  }

  private identifyIssues(analysis: any): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Structure issues
    if (!analysis.structure.indentationConsistent) {
      issues.push({
        severity: 'medium',
        category: 'Structure',
        description: 'Inconsistent indentation',
        suggestion: 'Use consistent indentation (2 or 4 spaces)',
      });
    }

    if (analysis.structure.avgLineLength > 120) {
      issues.push({
        severity: 'low',
        category: 'Structure',
        description: 'Lines too long',
        suggestion: 'Break long lines for better readability',
      });
    }

    // Readability issues
    if (analysis.readability.fleschScore < 30) {
      issues.push({
        severity: 'high',
        category: 'Readability',
        description: 'Content is very difficult to read',
        suggestion: 'Simplify language and break down complex sentences',
      });
    }

    if (analysis.readability.avgSentenceLength > 25) {
      issues.push({
        severity: 'medium',
        category: 'Readability',
        description: 'Sentences are too long',
        suggestion: 'Break down long sentences for clarity',
      });
    }

    // Completeness issues
    if (analysis.completeness.score < 0.6) {
      issues.push({
        severity: 'high',
        category: 'Completeness',
        description: 'Content appears incomplete',
        suggestion: `Missing: ${analysis.completeness.missingElements.join(', ')}`,
      });
    }

    // Consistency issues
    analysis.consistency.issues.forEach((issue: string) => {
      issues.push({
        severity: 'medium',
        category: 'Consistency',
        description: issue,
        suggestion: 'Maintain consistent formatting throughout',
      });
    });

    return issues;
  }

  private calculateQualityMetrics(analysis: any): QualityMetrics {
    const clarity = Math.min(1, analysis.readability.fleschScore / 70);
    const completeness = analysis.completeness.score;
    const specificity = analysis.usability.score;
    const consistency = analysis.consistency.score;
    const usability = analysis.usability.score;
    
    const overall = (clarity + completeness + specificity + consistency + usability) / 5;

    return {
      clarity: Math.round(clarity * 100) / 100,
      completeness: Math.round(completeness * 100) / 100,
      specificity: Math.round(specificity * 100) / 100,
      consistency: Math.round(consistency * 100) / 100,
      usability: Math.round(usability * 100) / 100,
      overall: Math.round(overall * 100) / 100,
    };
  }

  private generateSuggestions(issues: QualityIssue[], metrics: QualityMetrics): string[] {
    const suggestions: string[] = [];

    // Priority suggestions based on severity
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');

    if (criticalIssues.length > 0) {
      suggestions.push('Address critical issues immediately');
    }

    if (highIssues.length > 0) {
      suggestions.push('Focus on high-priority improvements first');
    }

    // Metric-based suggestions
    if (metrics.clarity < 0.6) {
      suggestions.push('Improve readability by simplifying language');
    }

    if (metrics.completeness < 0.7) {
      suggestions.push('Add missing essential elements');
    }

    if (metrics.consistency < 0.8) {
      suggestions.push('Ensure consistent formatting and style');
    }

    return suggestions;
  }

  private generateRecommendations(metrics: QualityMetrics, issues: QualityIssue[]): any {
    const priority = issues.length > 0 ? issues[0].severity : 'low';
    
    let recommendation = 'Good quality content';
    if (metrics.overall < 0.4) {
      recommendation = 'Significant improvements needed';
    } else if (metrics.overall < 0.7) {
      recommendation = 'Some improvements recommended';
    }

    return {
      overall: recommendation,
      priority,
      actionItems: issues.slice(0, 3).map(issue => issue.suggestion),
      estimatedEffort: this.estimateEffort(issues),
    };
  }

  private estimateEffort(issues: QualityIssue[]): 'low' | 'medium' | 'high' {
    const severityScores = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };

    const totalScore = issues.reduce((sum, issue) => 
      sum + severityScores[issue.severity], 0
    );

    if (totalScore <= 3) return 'low';
    if (totalScore <= 8) return 'medium';
    return 'high';
  }

  private async saveQualityAssessment(itemId: string, assessment: any): Promise<void> {
    // Store quality assessment in item metadata
    await prisma.item.update({
      where: { id: itemId },
      data: {
        metadata: JSON.stringify({
          qualityAssessment: {
            ...assessment,
            assessedAt: new Date().toISOString(),
          },
        }),
      },
    });
  }
}