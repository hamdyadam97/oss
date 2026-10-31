from xml.sax.saxutils import escape

from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.cache import cache_page

from apps.engagement.models import Service
from apps.professional.models import Course

from .models import Album, Page, Post, Program

STATIC_PATHS = [
    "/", "/about", "/programs", "/services", "/volunteer", "/media", "/gallery",
    "/governance", "/impact", "/partners", "/faq", "/contact", "/track", "/courses", "/membership",
    "/certificates",
]


@cache_page(60 * 30)
def sitemap(request):
    base = settings.SITE_URL
    urls = [(path, None) for path in STATIC_PATHS]
    urls += [(f"/programs/{p.slug}", p.updated_at) for p in Program.objects.published()]
    urls += [(f"/media/{p.slug}", p.updated_at) for p in Post.objects.published()]
    urls += [(f"/gallery/{a.slug}", a.updated_at) for a in Album.objects.published()]
    urls += [(f"/services/{s.slug}", s.updated_at) for s in Service.objects.filter(is_active=True)]
    urls += [(f"/p/{p.slug}", p.updated_at) for p in Page.objects.published()]
    urls += [(f"/courses/{c.slug}", c.updated_at) for c in Course.objects.published()]
    rows = []
    for path, updated in urls:
        lastmod = f"<lastmod>{updated.date().isoformat()}</lastmod>" if updated else ""
        rows.append(f"<url><loc>{escape(base + path)}</loc>{lastmod}</url>")
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + "".join(rows) + "</urlset>"
    )
    return HttpResponse(xml, content_type="application/xml")


def robots(request):
    body = f"User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: {settings.SITE_URL}/sitemap.xml\n"
    return HttpResponse(body, content_type="text/plain")
