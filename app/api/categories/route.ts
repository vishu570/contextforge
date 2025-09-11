import { getUserFromToken } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const categorySchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  parentId: z.string().optional(),
})

const updateCategorySchema = categorySchema.partial()

// Get all categories for a user
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get("stats") === "true"
    const format = searchParams.get("format") || "flat"

    // Get all categories with item counts
    const categories = await prisma.category.findMany({
      where: { userId: user.id },
      include: {
        items: includeStats,
        children: format === "tree",
        parent: format === "tree",
        _count: includeStats ? {
          select: { items: true }
        } : false
      },
      orderBy: { name: 'asc' }
    })

    // Transform the data for response
    const transformedCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      color: category.color,
      icon: category.icon,
      parentId: category.parentId,
      itemCount: includeStats ? category._count?.items || 0 : 0,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
      ...(format === "tree" && {
        children: category.children || [],
        parent: category.parent
      })
    }))

    // Return hierarchical format if requested
    if (format === "tree") {
      const tree = buildCategoryTree(transformedCategories)
      return NextResponse.json({
        success: true,
        categories: tree,
        total: categories.length,
      })
    }

    return NextResponse.json({
      success: true,
      categories: transformedCategories,
      total: categories.length,
    })
  } catch (error) {
    console.error("Categories fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    )
  }
}

// Create a new category
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = categorySchema.parse(body)

    // Check if category already exists
    const existingCategory = await prisma.category.findFirst({
      where: {
        userId: user.id,
        name: validatedData.name
      }
    })

    if (existingCategory) {
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 409 }
      )
    }

    // Validate parent category exists if provided
    if (validatedData.parentId) {
      const parentCategory = await prisma.category.findFirst({
        where: {
          id: validatedData.parentId,
          userId: user.id
        }
      })

      if (!parentCategory) {
        return NextResponse.json(
          { error: "Parent category not found" },
          { status: 400 }
        )
      }
    }

    // Create the category
    const category = await prisma.category.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        color: validatedData.color || "#3b82f6",
        icon: validatedData.icon || "folder",
        parentId: validatedData.parentId,
        userId: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      category: {
        id: category.id,
        name: category.name,
        description: category.description,
        color: category.color,
        icon: category.icon,
        parentId: category.parentId,
        itemCount: 0,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("Category creation error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid category data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    )
  }
}

// Update category
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("id")

    if (!categoryId) {
      return NextResponse.json(
        { error: "Category ID required" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = updateCategorySchema.parse(body)

    // Check if category exists and belongs to user
    const existingCategory = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: user.id
      }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      )
    }

    // Check for name conflicts if name is being updated
    if (validatedData.name && validatedData.name !== existingCategory.name) {
      const nameConflict = await prisma.category.findFirst({
        where: {
          userId: user.id,
          name: validatedData.name,
          id: { not: categoryId }
        }
      })

      if (nameConflict) {
        return NextResponse.json(
          { error: "Category name already exists" },
          { status: 409 }
        )
      }
    }

    // Validate parent category if being updated
    if (validatedData.parentId) {
      const parentCategory = await prisma.category.findFirst({
        where: {
          id: validatedData.parentId,
          userId: user.id
        }
      })

      if (!parentCategory) {
        return NextResponse.json(
          { error: "Parent category not found" },
          { status: 400 }
        )
      }

      // Prevent circular references
      if (validatedData.parentId === categoryId) {
        return NextResponse.json(
          { error: "Category cannot be its own parent" },
          { status: 400 }
        )
      }
    }

    // Update the category
    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: validatedData,
      include: {
        _count: {
          select: { items: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      category: {
        id: updatedCategory.id,
        name: updatedCategory.name,
        description: updatedCategory.description,
        color: updatedCategory.color,
        icon: updatedCategory.icon,
        parentId: updatedCategory.parentId,
        itemCount: updatedCategory._count.items,
        createdAt: updatedCategory.createdAt.toISOString(),
        updatedAt: updatedCategory.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("Category update error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid category data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    )
  }
}

// Delete category
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("id")
    const moveToCategory = searchParams.get("moveTo") || null

    if (!categoryId) {
      return NextResponse.json(
        { error: "Category ID required" },
        { status: 400 }
      )
    }

    // Check if category exists and belongs to user
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: user.id
      },
      include: {
        items: true,
        children: true
      }
    })

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      )
    }

    // Check if move-to category exists if specified
    if (moveToCategory) {
      const targetCategory = await prisma.category.findFirst({
        where: {
          id: moveToCategory,
          userId: user.id
        }
      })

      if (!targetCategory) {
        return NextResponse.json(
          { error: "Target category not found" },
          { status: 400 }
        )
      }
    }

    // Use transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Handle items in this category
      if (moveToCategory) {
        // Move items to new category
        await tx.itemCategory.updateMany({
          where: { categoryId },
          data: { categoryId: moveToCategory }
        })
      } else {
        // Remove category assignments
        await tx.itemCategory.deleteMany({
          where: { categoryId }
        })
      }

      // Handle child categories - move them to parent or root
      if (category.children.length > 0) {
        await tx.category.updateMany({
          where: { parentId: categoryId },
          data: { parentId: category.parentId }
        })
      }

      // Delete the category
      await tx.category.delete({
        where: { id: categoryId }
      })

      return {
        itemsAffected: category.items.length,
        childrenMoved: category.children.length
      }
    })

    return NextResponse.json({
      success: true,
      message: `Category deleted. ${result.itemsAffected} items ${
        moveToCategory ? `moved to new category` : "uncategorized"
      }${result.childrenMoved > 0 ? `, ${result.childrenMoved} child categories moved up` : ""}`,
      itemsAffected: result.itemsAffected,
      childrenMoved: result.childrenMoved
    })
  } catch (error) {
    console.error("Category deletion error:", error)
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    )
  }
}

function buildCategoryTree(categories: any[]): any[] {
  const categoryMap = new Map(
    categories.map((cat) => [cat.id, { ...cat, children: [] }])
  )
  const rootCategories: any[] = []

  categories.forEach((category) => {
    const cat = categoryMap.get(category.id)!

    if (category.parentId && categoryMap.has(category.parentId)) {
      const parent = categoryMap.get(category.parentId)!
      parent.children.push(cat)
    } else {
      rootCategories.push(cat)
    }
  })

  return rootCategories
}