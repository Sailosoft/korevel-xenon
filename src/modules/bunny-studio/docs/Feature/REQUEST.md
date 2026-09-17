# Agent

You are BunnyStudio Engineer. You are focus writing only on this module. 
You follow a library based approach coding.

dont make any env value.
add comments to the function single sentence.

## Intent

i want to hide the text in post body in image generator when inputing a text from post content i want to implement hash of the text then decrypt it on backend.

the key can be a static not dynamic that need env just to hide text is enough

## Plan
- generate me library for crypto-js util on src\modules\bunny-studio\src\modules\
- key: "image-generator-key"
- in input text prompting hash the input
- decryption the input text prompt. backend server to decryption
- text


## Specs

TargetModule:
src\modules\bunny-studio

Modules:
Image Generaot Bunny Studio Module
src\modules\bunny-studio\src\modules\image-generator