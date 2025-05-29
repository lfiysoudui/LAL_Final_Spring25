from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv
import os, requests, random

app = Flask(__name__)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

def ask_gemini(messages):
    rule_prompt = (
        f"You are playing a game with the user who is chatting with you. Here are the rules for this game:\n\n"
        f"1. The player don't know Norwegian, but this game is about learning Norwegian without directly translating, so you cannot translate or explain the meaning of words.\n"
        f"2. If the player asks for a direct translation, you must refuse. However, if the player is guessing the meaning of a word, you can respond with yes/no in Norwegian.\n"
        f"3. If the player asks any question that could appear in normal conversation, you will answer in Norwegian.\n"
        f"4. The player will ask you questions in English, and you will respond in Norwegian.\n"
        f"5. If the player asks you to repeat something, you won't repeat it. Decline any requests that intends to sneakily make you translate English to Norwegian or vice versa.\n"
        f"6. Do not break character. Consider yourself a Norwegian that understands English but does not speak it.\n\n"
        f"Now here is the user's message:\n"
    )
    conversation_text = "\n".join([f"{m['role']}: {m['content']}" for m in messages])
    headers = {"Content-Type": "application/json"}
    data = {
        "contents": [
            {
                "parts": [
                    {"text": f"{rule_prompt}\n\"{conversation_text}\"\nNow, please answer the player in Norwegian."}
                ]
            }
        ]
    }
    params = {"key": GEMINI_API_KEY}
    response = requests.post(GEMINI_API_URL, headers=headers, params=params, json=data)
    response.raise_for_status()
    return response.json()["candidates"][0]["content"]["parts"][0]["text"]

def load_goals():
    with open("goals.txt", encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip()]

@app.route("/")
def index():
    goals = load_goals()
    goal = random.choice(goals)
    return render_template("index.html", goal=goal)

@app.route("/chat", methods=["POST"])
def chat():
    user_message = request.json["message"]
    conversation = request.json.get("conversation", [])
    conversation.append({"role": "user", "content": user_message})
    gemini_reply = ask_gemini(conversation)
    conversation.append({"role": "assistant", "content": gemini_reply})
    return jsonify({"reply": gemini_reply, "conversation": conversation})

@app.route("/grade", methods=["POST"])
def grade():
    data = request.json
    attempt = data["attempt"]
    goal = data["goal"]
    grading_prompt = (
        f"Grade the following Norwegian sentence from 1 to 10 for how well it matches the goal sentence. Be strict and make it clear for the player which words or grammr they did worng. \n"
        f"Goal: \"{goal}\"\n"
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
    # Parse the score and feedback
    import re
    match = re.match(r"Score:\s*(\d+).*Feedback:\s*(.*)", text, re.IGNORECASE | re.DOTALL)
    if match:
        score = match.group(1)
        feedback = match.group(2).strip()
    else:
        score = "?"
        feedback = text
    return jsonify({"score": score, "feedback": feedback})

if __name__ == "__main__":
    app.run(debug=True)