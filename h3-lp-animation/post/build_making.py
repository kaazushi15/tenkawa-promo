# Fill the making-of template with a real excerpt of the timeline code.
import html, re
code = open('post/code_excerpt.txt').read().rstrip()
c = html.escape(code, quote=False)
c = re.sub(r'(?<![\w#&])(\d+\.?\d*|\.\d+)', r'<span class="num">\1</span>', c)
c = re.sub(r'\b(const|return|function)\b', r'<span class="kw">\1</span>', c)
c = re.sub(r"('[^'\n]*')", r'<span class="str">\1</span>', c)
s = open('post/making.tpl.html').read().replace('{{CODE}}', c)
s = s.replace('function render(t) {', 'function draw(t) {').replace("else render(0);", "else draw(0);").replace("render(((performance.now() - t0) / 1000) % END)", "draw(((performance.now() - t0) / 1000) % END)").replace("window.render = async t => { render(t);", "window.render = async t => { draw(t);")
open('post/making.html', 'w').write(s)
