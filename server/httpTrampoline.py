from flask import Flask, request, redirect
import waitress
app = Flask(__name__)
@app.before_request
def bounce():
    return redirect(request.url.replace("http://", "https://", 1))
if __name__ == '__main__':
    waitress.serve(app, host='0.0.0.0', port=80)
