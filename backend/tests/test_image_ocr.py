import os
import json
import base64
import asyncio
from openai import AsyncOpenAI

async def main():
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        # Load from .env file manually
        with open(".env", "r") as f:
            for line in f:
                if "OPENROUTER_API_KEY" in line:
                    parts = line.split("=", 1)
                    if len(parts) == 2:
                        api_key = parts[1].strip().strip('"').strip("'")
                        break
                        
    if not api_key:
        print("Error: OPENROUTER_API_KEY not found in environment or .env file.")
        return

    file_path = "/Users/akilan/Downloads/IMG_8852.jpg"
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} does not exist.")
        return

    print("Encoding image to Base64...")
    with open(file_path, "rb") as f:
        base64_image = base64.b64encode(f.read()).decode("utf-8")

    client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key
    )

    print("Sending request to OpenRouter (google/gemini-2.5-flash)...")
    try:
        response = await client.chat.completions.create(
            model="google/gemini-2.5-flash",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "You are a receipt parsing assistant. Extract the transaction details from this image. "
                                "Respond ONLY with a JSON object containing keys: 'merchant', 'amount' (float), 'date' (YYYY-MM-DD), 'notes' (short summary). "
                                "Do not include markdown tags or code fences around the JSON."
                            )
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            temperature=0.0
        )
        result_text = response.choices[0].message.content.strip()
        print("----------------------------------------")
        print("Model Response:")
        print(result_text)
        print("----------------------------------------")
    except Exception as e:
        print(f"Error calling OpenRouter: {e}")

if __name__ == "__main__":
    asyncio.run(main())
