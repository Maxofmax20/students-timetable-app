const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  const email = 'xsmms24128105@gmail.com';
  console.log(`Checking DB for ${email}...`);
  
  const user = await p.user.findUnique({ where: { email } });
  
  if (user) {
    console.log('--- USER EXISTS ---');
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('Has Password Hash:', !!user.passwordHash);
    console.log('Email Verified At:', user.emailVerifiedAt);
    
    // Check tokens
    const tokens = await p.otpCode.findMany({ where: { email, purpose: 'PASSWORD_RESET' } });
    console.log('--- RESET TOKENS ---');
    console.log(`Found ${tokens.length} tokens`);
    tokens.forEach(t => {
      console.log(`Token expires: ${t.expiresAt}, Consumed: ${t.consumedAt}`);
    });
  } else {
    console.log('--- USER DOES NOT EXIST ---');
  }
}

run()
  .catch(console.error)
  .finally(async () => {
    await p.$disconnect();
  });
