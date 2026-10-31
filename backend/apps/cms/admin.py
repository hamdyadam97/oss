from django.contrib import admin

from . import models

for model in (
    models.SiteSettings, models.Page, models.Banner, models.AboutItem, models.BoardMember, models.FAQ,
    models.Statistic, models.Partner, models.Program, models.ProgramImage, models.Post, models.Album,
    models.MediaItem, models.Document,
):
    admin.site.register(model)
