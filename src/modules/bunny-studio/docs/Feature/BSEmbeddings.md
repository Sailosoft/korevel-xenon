https://api.siliconflow.com/v1/embeddings

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.siliconflow.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Create embeddings

> Creates an embedding vector representing the input text.



## OpenAPI

````yaml post /embeddings
openapi: 3.0.0
info:
  title: SiliconFlow API
  description: The SiliconFlow REST API
  version: 1.0.0
  contact:
    name: SiliconFlow Support
    url: https://www.siliconflow.com/
  license:
    name: MIT
    url: https://github.com/siliconflow-inc/siliconflow-api/blob/main/LICENSE
servers:
  - url: https://api.siliconflow.com/v1
security:
  - bearerAuth: []
paths:
  /embeddings:
    post:
      tags:
        - Embeddings
      summary: Create Embeddings
      description: Creates an embedding vector representing the input text.
      operationId: createEmbedding
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/EmbeddingsRequest'
      responses:
        '200':
          description: '200'
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EmbeddingsResponse'
        '400':
          description: BadRequest
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BadRquestData'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UnauthorizedData'
        '404':
          description: NotFound
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NotFoundData'
        '429':
          description: RateLimit
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RateLimitData'
        '503':
          description: Overloaded
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OverloadedtData'
        '504':
          description: Timeout
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TimeoutData'
      deprecated: false
components:
  schemas:
    EmbeddingsRequest:
      type: object
      required:
        - model
        - input
      properties:
        model:
          type: string
          description: >-
            Corresponding Model Name. To better enhance service quality, we will
            make periodic changes to the models provided by this service,
            including but not limited to model on/offlining and adjustments to
            model service capabilities. We will notify you of such changes
            through appropriate means such as announcements or message pushes
            where feasible.
          example: Qwen/Qwen3-Embedding-8B
          default: Qwen/Qwen3-Embedding-8B
          enum:
            - Qwen/Qwen3-Embedding-8B
            - Qwen/Qwen3-Embedding-4B
            - Qwen/Qwen3-Embedding-0.6B
        input:
          description: >
            Input text to embed must be provided as a string or an array of
            tokens. To process multiple inputs in a single request, pass an
            array of strings or an array of token arrays. The input length must
            not exceed the model's maximum token limit and should not be an
            empty string.

            The maximum input tokens for each model are as follows:


            BAAI/bge-large-zh-v1.5, BAAI/bge-large-en-v1.5,
            netease-youdao/bce-embedding-base_v1: 512

            BAAI/bge-m3: 8192

            Qwen/Qwen3-Embedding-8B, Qwen/Qwen3-Embedding-4B,
            Qwen/Qwen3-Embedding-0.6B: 32768
          default: >-
            Silicon flow embedding online: fast, affordable, and high-quality
            embedding services. come try it out!
          oneOf:
            - type: string
              title: string
              description: >-
                The string that will be turned into an embedding. the item must
                not exceed the max models tokens limitation.
              default: >-
                Silicon flow embedding online: fast, affordable, and
                high-quality embedding services. come try it out!
              example: >-
                Silicon flow embedding online: fast, affordable, and
                high-quality embedding services. come try it out!
            - type: array
              title: array
              description: >
                The array of strings that will be turned into an embedding. The
                array length must not exceed the max size, and the item must not
                exceed the max models tokens limitation.

                Current, the maximum array size is 32 , At the same time every
                item must not exceed 512 tokens for current models.
              minItems: 1
              maxItems: 32
              items:
                type: string
                default: '[''LLM'', ''Embedding'', ''RAG'']'
                example: '[''LLM'', ''Embedding'', ''RAG'']'
        encoding_format:
          description: >
            "The format to return the embeddings in. Can be either `float` or
            [`base64`](https://pypi.org/project/pybase64/). "
          example: float
          default: float
          type: string
          enum:
            - float
            - base64
        dimensions:
          description: >
            The number of dimensions the resulting output embeddings should
            have. Only supported in `Qwen/Qwen3` series.  -
            Qwen/Qwen3-Embedding-8B: [64,128,256,512,768,1024,2048,4096] - 
            Qwen/Qwen3-Embedding-4B:[64,128,256,512,768,1024,2048] -
            Qwen/Qwen3-Embedding-0.6B: [64,128,256,512,768,1024]
          type: integer
          example: 1024
    EmbeddingsResponse:
      type: object
      required:
        - object
        - model
        - data
        - usage
      properties:
        object:
          type: string
          description: The object type, which is always "list".
          enum:
            - - list
        model:
          description: The name of the model used to generate the embedding.
          type: string
        data:
          type: array
          description: The list of embeddings generated by the model.
          items:
            type: object
            required:
              - index
              - object
              - embedding
            properties:
              object:
                type: string
                enum:
                  - embedding
              embedding:
                type: array
                items:
                  type: number
              index:
                type: integer
        usage:
          type: object
          description: The usage information for the request.
          properties:
            prompt_tokens:
              type: integer
              description: The number of tokens used by the prompt.
            completion_tokens:
              type: integer
              description: The number of tokens used by the completion.
            total_tokens:
              type: integer
              description: The total number of tokens used by the request.
          required:
            - prompt_tokens
            - total_tokens
            - completion_tokens
    BadRquestData:
      type: object
      required:
        - message
        - data
        - code
      properties:
        code:
          type: integer
          nullable: true
          default: false
          example: 20012
        message:
          type: string
          nullable: false
        data:
          type: string
          nullable: false
    UnauthorizedData:
      type: string
      default: false
      example: Invalid token
    NotFoundData:
      type: string
      default: false
      example: 404 page not found
    RateLimitData:
      type: object
      required:
        - message
        - data
      properties:
        message:
          type: string
          example: >-
            Request was rejected due to rate limiting. If you want more, please
            contact contact@siliconflow.com. Details:TPM limit reached.
        data:
          type: string
    OverloadedtData:
      type: object
      required:
        - code
        - message
        - data
      properties:
        code:
          type: integer
          example: 50505
        message:
          type: string
          example: Model service overloaded. Please try again later.
        data:
          type: string
          nullable: false
    TimeoutData:
      type: string
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: your api key
      description: >-
        Use the following format for authentication: Bearer [<your api
        key>](https://cloud.siliconflow.com/account/ak)

````