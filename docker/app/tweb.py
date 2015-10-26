from twisted.web import server, resource
from twisted.internet import reactor
from twisted.internet.endpoints import serverFromString


class Simple(resource.Resource):
    isLeaf = True

    def render_GET(self, request):
        return "<html>Hello, world!</html>"


site = server.Site(Simple())

endpoint = serverFromString(reactor, b"tcp:8888")
endpoint.listen(site)

reactor.run()
