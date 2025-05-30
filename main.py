from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from dotenv import load_dotenv
import os, requests, random, secrets

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

LANGUAGES = {
    "no": "Norwegian",        # Germanic (Indo-European)
    "es": "Spanish",          # Romance (Indo-European)
    "ru": "Russian",          # Slavic (Indo-European)
    "el": "Greek",            # Hellenic (Indo-European)
    "tr": "Turkish",          # Turkic
    "ar": "Arabic",           # Semitic (Afro-Asiatic)
    "he": "Hebrew",           # Semitic (Afro-Asiatic)
    "zh": "Mandarin",          # Sino-Tibetan
    "yue": "Cantonese",       # Sino-Tibetan
    "ja": "Japanese",         # Japonic
    "ko": "Korean",           # Koreanic
    "vi": "Vietnamese",       # Austroasiatic
    "th": "Thai",             # Kra–Dai
    "sw": "Swahili",          # Bantu (Niger–Congo)
    "hi": "Hindi",            # Indic (Indo-European)
    "bn": "Bengali",          # Indic (Indo-European)
    "fi": "Finnish",          # Uralic
    "hu": "Hungarian",        # Uralic
    "ms": "Malay",            # Austronesian
    "id": "Indonesian",       # Austronesian
    "ta": "Tamil",            # Dravidian
    "fa": "Persian",          # Iranian (Indo-European)
}

DIFFICULTY_LEVELS = ["easy", "medium", "hard", "crazy"]

def load_goals(difficulty):
    if difficulty not in DIFFICULTY_LEVELS:
        raise ValueError("Invalid difficulty level")
    filename = os.path.join("goals", f"{difficulty}.txt")
    with open(filename, encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip()]

@app.route("/")
def index():
    return redirect(url_for("select_language"))

@app.route("/select_language", methods=["GET", "POST"])
def select_language():
    if request.method == "POST":
        session["language"] = request.form["language"]
        session["difficulty"] = request.form["difficulty"]
        return redirect(url_for("game"))
    highest_score = session.get("highest_score", None)  # Get the highest score from the session
    return render_template("select_language.html", languages=LANGUAGES, highest_score=highest_score)

@app.route("/game")
def game():
    language = session.get("language", "no")
    difficulty = session.get("difficulty", "easy")
    goals = load_goals(difficulty)
    goal = random.choice(goals)
    return render_template("index.html", goal=goal, language=LANGUAGES[language], difficulty=difficulty)

def ask_gemini(messages, language):
    rule_prompt = (
        f"You are playing a game with the user who is chatting with you. Here are the rules for this game:\n\n"
        f"1. The player doesn't know {language}, but this game is about learning {language} without directly translating, so you cannot translate or explain the meaning of words.\n"
        f"2. If the player asks for a direct translation, you must refuse. However, if the player is guessing the meaning of a word, you can respond with yes/no in {language}.\n"
        f"3. If the player asks any question that could appear in normal conversation, you will answer in {language}.\n"
        f"4. The player will ask you questions in English, and you will respond in {language}.\n"
        f"5. If the player asks you to repeat something, you won't repeat it. Decline any requests that intend to sneakily make you translate English to {language} or vice versa.\n"
        f"6. Do not break character. Consider yourself a native {language} speaker who understands English but does not speak it.\n\n"
        f"Now here is the user's message:\n"
    )
    conversation_text = "\n".join([f"{m['role']}: {m['content']}" for m in messages])
    headers = {"Content-Type": "application/json"}
    data = {
        "contents": [
            {
                "parts": [
                    {"text": f"{rule_prompt}\n\"{conversation_text}\"\nNow, please answer the player in {language}."}
                ]
            }
        ]
    }
    params = {"key": GEMINI_API_KEY}
    response = requests.post(GEMINI_API_URL, headers=headers, params=params, json=data)
    response.raise_for_status()
    return response.json()["candidates"][0]["content"]["parts"][0]["text"]

@app.route("/chat", methods=["POST"])
def chat():
    language_code = session.get("language", "no")
    language = LANGUAGES[language_code]
    user_message = request.json["message"]
    conversation = request.json.get("conversation", [])
    conversation.append({"role": "user", "content": user_message})
    gemini_reply = ask_gemini(conversation, language)
    conversation.append({"role": "assistant", "content": gemini_reply})
    return jsonify({"reply": gemini_reply, "conversation": conversation})

@app.route("/grade", methods=["POST"])
def grade():
    language_code = session.get("language", "no")
    language = LANGUAGES[language_code]
    data = request.json
    attempt = data["attempt"]
    goal = data["goal"]
    grading_prompt = (
        f"Grade the following {language} sentence from 1 to 10 for how well it matches the English goal sentence. "
        f"Be strict and make it clear for the player which words or grammar they did wrong.\n"
        f"Goal (English): \"{goal}\"\n"
        f"Player attempt: \"{attempt}\"\n"
        f"Reply ONLY in this format: Score: <number>. Feedback: <feedback in English>."
    )
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": grading_prompt}
                ]
            }
        ]
    }
    params = {"key": GEMINI_API_KEY}
    response = requests.post(GEMINI_API_URL, headers=headers, params=params, json=payload)
    response.raise_for_status()
    text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
    import re
    match = re.match(r"Score:\s*(\d+).*Feedback:\s*(.*)", text, re.IGNORECASE | re.DOTALL)
    if match:
        score = int(match.group(1))  # Convert score to integer
        feedback = match.group(2).strip()
    else:
        score = 0  # Default score if parsing fails
        feedback = text

    # Update the highest score in the session
    highest_score = session.get("highest_score", 0)
    if score > highest_score:
        session["highest_score"] = score

    return jsonify({"score": score, "feedback": feedback})

if __name__ == "__main__":
    app.run(debug=True)