# The making-of page is self-contained; kept as a build step so the template stays the source of truth.
open('post/making.html', 'w').write(open('post/making.tpl.html').read())
