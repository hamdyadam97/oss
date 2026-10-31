import os
import uuid

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.utils.deconstruct import deconstructible
from django.utils.functional import cached_property


class PrivateStorage(FileSystemStorage):
    """Storage outside MEDIA_ROOT; files are only reachable through permission-checked views."""

    @cached_property
    def base_location(self):
        return self._value_or_setting(self._location, settings.PRIVATE_MEDIA_ROOT)

    def url(self, name):
        raise NotImplementedError("Private files have no public URL")


private_storage = PrivateStorage()


@deconstructible
class RandomFilename:
    """Replaces the uploaded name with a random one, keeping only the extension."""

    def __init__(self, folder: str):
        self.folder = folder

    def __call__(self, instance, filename):
        ext = os.path.splitext(filename)[1].lower()[:10]
        return f"{self.folder}/{uuid.uuid4().hex}{ext}"

    def __eq__(self, other):
        return isinstance(other, RandomFilename) and other.folder == self.folder
