SELECT id, email, "passwordHash" IS NOT NULL AS has_password, "emailVerifiedAt" IS NOT NULL AS is_verified
FROM "User"
WHERE email = 'xsmms24128105@gmail.com';
