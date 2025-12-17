# Setup Instructions

## Google Places API Key Setup

To get real contextual information about places (like temples, buildings, etc.), you need to set up a Google Places API key.

### Steps:

1. **Get a Google API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the "Places API" for your project
   - Create credentials (API Key)
   - Restrict the API key to "Places API" for security

2. **Add to your project:**
   - Create a `.env` file in the project root (if it doesn't exist)
   - Add your API key:
     ```
     GOOGLE_API_KEY=your_actual_api_key_here
     ```

3. **Restart the dev server:**
   ```bash
   npm run dev:network
   ```

### Testing:

Once the API key is set up:
- Grant location permissions when prompted
- Tap on a building or landmark
- You should see the real name and type of the place

### Note:

The app will work without the API key, but will only show generic location information instead of real place names.


