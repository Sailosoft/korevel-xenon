src\modules\bunny-studio
# Task 1: Configuration Video Generator

Use HelixConfig for API key
src\modules\helix\src\HelixConfig.ts

do not generate redundant configuration for api keys and url.

put the model available per provider
create HelixConfig.Video.ts

rightnow support is silicon flow but it will support other providers
models:
Wan-AI/Wan2.2-I2V-A14B
Wan-AI/Wan2.2-T2V-A14B


then generate HelixSiliconFlowAdapter.ts

add a adapter for video creation
```
curl --request POST \
  --url https://api.siliconflow.com/v1/video/submit \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '
{
  "prompt": "<string>"
}
```
Full Documentation:
src\modules\bunny-studio\docs\Feature\VideoSubmit.md

the adapter will process the video using the create video api and retrieve video api.

then download the videoblob via the response vide string of video.

then return the blob.

# Task 2: Support bunny-studio VideoGenerator

Reference the bunny-studio image generator
src\modules\bunny-studio\src\modules\image-generator

genearte new module video-generator with its own.

add settings video generator settings
use helix
src\modules\bunny-studio\src\modules\ai-settings

I could generate and play video blob and download video.

