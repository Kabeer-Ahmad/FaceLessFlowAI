import { deployFunction, deploySite, getOrCreateBucket } from '@remotion/lambda';
import path from 'path';
import { ram, diskSize, timeout, region } from './config';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') }); // Load env vars from root

const execute = async () => {
    console.log('🚀 Starting Deployment...');

    const { bucketName } = await getOrCreateBucket({ region });
    console.log(`✅ Bucket found: ${bucketName}`);

    const { functionName, alreadyExisted } = await deployFunction({
        createCloudWatchLogGroup: true,
        region,
        memorySizeInMb: ram,
        diskSizeInMb: diskSize,
        timeoutInSeconds: timeout,
    });
    console.log(`✅ Lambda Function: ${functionName} (${alreadyExisted ? 'Updated' : 'Created'})`);

    console.log('📦 Bundling and uploading site...');
    const { serveUrl } = await deploySite({
        bucketName,
        entryPoint: path.join(process.cwd(), 'remotion/entry.ts'),
        region,
        options: {
            webpackOverride: (config) => config, // Add custom webpack if needed
        },
    });

    console.log(`✅ Site Deployed: ${serveUrl}`);
    console.log('---------------------------------------------');
    console.log('Paste these into your .env.local:');
    console.log(`REMOTION_AWS_REGION=${region}`);
    console.log(`REMOTION_AWS_ACCESS_KEY_ID=${process.env.AWS_ACCESS_KEY_ID ?? 'YOUR_KEY'}`);
    console.log(`REMOTION_AWS_SECRET_ACCESS_KEY=${process.env.AWS_SECRET_ACCESS_KEY ?? 'YOUR_SECRET'}`);
    console.log(`REMOTION_AWS_BUCKET=${bucketName}`);
    console.log(`REMOTION_AWS_FUNCTION_NAME=${functionName}`);
    console.log(`REMOTION_SERVE_URL=${serveUrl}`);
};

execute()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
