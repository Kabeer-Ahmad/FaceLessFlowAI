import { IAMClient, GetRoleCommand, CreateRoleCommand, UpdateAssumeRolePolicyCommand, PutRolePolicyCommand, AttachRolePolicyCommand } from "@aws-sdk/client-iam";
import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(process.cwd(), '.env.local') });

const client = new IAMClient({
    region: process.env.REMOTION_AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
});

const ROLE_NAME = 'remotion-lambda-role';

const fixRole = async () => {
    try {
        console.log(`🔍 Checking role: ${ROLE_NAME}...`);

        const trustPolicy = JSON.stringify({
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: {
                        Service: "lambda.amazonaws.com"
                    },
                    Action: "sts:AssumeRole"
                }
            ]
        });

        // 1. Ensure Role Exists
        try {
            await client.send(new GetRoleCommand({ RoleName: ROLE_NAME }));
            console.log(`✅ Role found.`);
        } catch (e: any) {
            if (e.name === 'NoSuchEntityException') {
                console.log(`⚠️ Role not found. Creating ${ROLE_NAME}...`);
                await client.send(new CreateRoleCommand({
                    RoleName: ROLE_NAME,
                    AssumeRolePolicyDocument: trustPolicy,
                    Description: "Auto-created by Remotion setup script"
                }));
                console.log(`✅ Role created successfully.`);
            } else {
                throw e;
            }
        }

        // 2. Fix Trust Policy (to be safe)
        console.log(`🛠️ Fixing Trust Policy...`);
        await client.send(new UpdateAssumeRolePolicyCommand({
            RoleName: ROLE_NAME,
            PolicyDocument: trustPolicy
        }));

        // 3. Add S3 & Logging Permissions
        console.log(`🛠️ Adding S3 & Logging Permissions...`);

        // Basic Execution (Logs)
        await client.send(new AttachRolePolicyCommand({
            RoleName: ROLE_NAME,
            PolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
        }));

        // S3 Access (Critical for Remotion)
        const s3Policy = JSON.stringify({
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Action: [
                        "s3:ListAllMyBuckets",
                        "s3:GetBucketLocation",
                        "s3:ListBucket",
                        "s3:GetObject",
                        "s3:PutObject",
                        "s3:DeleteObject",
                        "s3:PutObjectAcl",
                        "lambda:InvokeFunction"
                    ],
                    Resource: "*" // For ListAllMyBuckets and InvokeFunction.
                }
            ]
        });

        await client.send(new PutRolePolicyCommand({
            RoleName: ROLE_NAME,
            PolicyName: 'RemotionS3Access',
            PolicyDocument: s3Policy
        }));

        console.log(`✅ Success! Role permissions fully updated.`);

    } catch (error) {
        console.error("Error fixing role:", error);
    }
};

fixRole();
