# LAL_Final_Spring25

This is the repository for the final project of the Logical Analysis of Language course in Spring 2025. The project is a web game that allows users to pick up a language without any prior knowledge.

To run the project, follow these steps:

1. Clone the repository:

```bash
git clone https://github.com/lfiysoudui/LAL_Final_Spring25
cd LAL_Final_Spring25
```

2. Install the required dependencies:
```bash
pip install -r requirements.txt
```

3. Add your Gemini API key to the `.env` file:
```bash
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

Replace `your_api_key_here` with your actual Gemini API key. If you don't have one, you can sign up for access at [Google Cloud](https://ai.google.dev/gemini-api/docs/api-key).

4. Run the application:
```bash
gunicorn --bind 0.0.0.0:8000 main:app
```    