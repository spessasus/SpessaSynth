from flask import Flask, abort, Response, redirect, request
import webbrowser
import os.path
from mimetypes import guess_type
import requests

HOST = "127.0.0.1"
PORT = 81
AUTO_OPEN = False

app = Flask(__name__)


@app.route('/<path:path>')
def get_default_path(path):
    if os.path.isfile(path):
        data = open(path, 'rb').read()

        type = guess_type(path)
        print(type)
        if type[0] is not None:
            r = Response(response=data,
                         status=200,
                         headers={
                             "Content-Type": type[0]
                         })
        else:
            r = Response(response=data,
                         status=200)
        return r
    else:
        abort(404)

@app.route("/")
def get_index():
    return redirect("/index.html")

@app.route("/proxy", methods=["GET"])
def proxy():
    if request.method == "GET":
        url = request.args.get("url")
        req = requests.get(url)
        res = Response(response=req.content, status=200)
        print(len(req.content))
        return res
    else:
        abort(400)


if __name__ == "__main__":
    if AUTO_OPEN:
        browser = webbrowser.get()
        browser.open_new(f"http://{HOST}:{PORT}")
        print(f"opening http://{HOST}:{PORT}")
    app.run(HOST, PORT, True)
