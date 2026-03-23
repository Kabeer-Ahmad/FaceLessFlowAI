const { google } = require('googleapis');
const readline = require('readline');

// Ensure this matches the Authorized Redirect URIs in your Google Cloud Console for the specific Client ID!
const REDIRECT_URI = 'http://localhost:3000';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function getToken() {
  console.log('\n--- YouTube Authenticator Script ---');
  rl.question('Enter the Client ID: ', (clientId) => {
    rl.question('Enter the Client Secret: ', (clientSecret) => {
      
      const oauth2Client = new google.auth.OAuth2(
        clientId.trim(),
        clientSecret.trim(),
        REDIRECT_URI
      );

      const scopes = [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.readonly'
      ];

      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent' // Forces consent screen to ensure refresh token is returned
      });

      console.log('\n======================================');
      console.log('1. IMPORTANT: In your Google Cloud Console, ensure "http://localhost:3000" is added to the "Authorized redirect URIs" for this Client ID.');
      console.log('2. Click this link and sign in with the target YouTube Channel account:');
      console.log('\n' + url + '\n');
      console.log('======================================\n');
      console.log('3. After authorizing, Google will redirect you to a page (e.g., http://localhost:3000/?code=4/0Aea...).');
      console.log('   (It is completely fine if the page says "This site can’t be reached")');
      console.log('4. Look at the URL in your browser and copy ONLY the value after "code=".');
      
      rl.question('\nEnter the code from the URL here: ', async (code) => {
        try {
            // Strip any trailing ampersands or url parameters that might have been accidentally copied
            const cleanCode = code.trim().split('&')[0];
            const { tokens } = await oauth2Client.getToken(cleanCode);
            console.log('\n✅ SUCCESS! Here are your tokens:');
            console.log('--------------------------------------');
            console.log(`Access Token: ${tokens.access_token}`);
            console.log(`Refresh Token: ${tokens.refresh_token}`);
            console.log('--------------------------------------');
            if (!tokens.refresh_token) {
                console.log('⚠️ WARNING: No refresh token was returned. This usually happens if you have previously authorized the app. Go to your Google Account permissions, remove the app, and run this script again.');
            } else {
                console.log('Save the Refresh Token into your .env.local file!');
            }
        } catch (error) {
          console.error('\n❌ Error getting tokens:', error.response ? error.response.data : error.message);
        }
        rl.close();
      });
    });
  });
}

getToken();
