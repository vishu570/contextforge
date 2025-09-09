const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedTestData() {
  console.log('Starting to seed test data...');

  try {
    // Find or create test user
    let user = await prisma.user.findUnique({
      where: { email: 'admin@contextforge.com' }
    });

    if (!user) {
      // Create bcrypt hash for 'admin123'
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      user = await prisma.user.create({
        data: {
          email: 'admin@contextforge.com',
          name: 'Admin User',
          passwordHash: hashedPassword
        }
      });
      console.log('Created admin user');
    }

    // Create sample items of different types
    const sampleItems = [
      {
        type: 'prompt',
        name: 'Code Review Assistant',
        content: 'You are an expert code reviewer. Please analyze the following code and provide constructive feedback on code quality, security, performance, and best practices.',
        format: 'prompt',
        author: 'System',
        language: 'en',
        targetModels: 'claude,gpt'
      },
      {
        type: 'prompt',
        name: 'API Documentation Writer',
        content: 'Generate comprehensive API documentation for the following endpoint. Include parameter descriptions, example requests/responses, and error codes.',
        format: 'prompt',
        author: 'System',
        language: 'en',
        targetModels: 'claude,gpt'
      },
      {
        type: 'agent',
        name: 'Unity Developer Assistant',
        content: 'I am a Unity development specialist. I help with C# scripting, game object management, physics implementation, and Unity best practices.',
        format: 'agent',
        author: 'System',
        language: 'en',
        targetModels: 'claude'
      },
      {
        type: 'agent',
        name: 'UI/UX Designer',
        content: 'I am a UI/UX design expert specializing in user interface design, user experience optimization, and design systems.',
        format: 'agent',
        author: 'System',
        language: 'en',
        targetModels: 'gpt,claude'
      },
      {
        type: 'template',
        name: 'Sales Automation Template',
        content: 'Template for automated sales follow-up emails and customer interaction workflows.',
        format: 'template',
        author: 'System',
        language: 'en',
        targetModels: 'gpt'
      },
      {
        type: 'rule',
        name: 'Reference Builder Rule',
        content: 'Always include relevant documentation links and code examples when providing technical assistance.',
        format: 'rule',
        author: 'System',
        language: 'en',
        targetModels: 'claude,gpt'
      }
    ];

    for (const itemData of sampleItems) {
      await prisma.item.create({
        data: {
          ...itemData,
          userId: user.id,
          metadata: JSON.stringify({
            category: itemData.type,
            version: '1.0',
            created_by: 'seed_script'
          })
        }
      });
    }

    console.log('✅ Successfully seeded test data!');
    console.log(`Created ${sampleItems.length} items for user: ${user.email}`);

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedTestData();