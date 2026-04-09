
import { prisma } from "./lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  
  if (!email || !password) process.exit(1);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    process.exit(1);
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (isValid) {
    console.log(JSON.stringify({ id: user.id, email: user.email, displayName: user.displayName }));
  } else {
    process.exit(1);
  }
}
main().catch(() => process.exit(1));
    