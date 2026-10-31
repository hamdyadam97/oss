from django.http import QueryDict
from rest_framework import serializers

CLEAR_SUFFIX = "__clear"


class AdminSerializer(serializers.ModelSerializer):
    """Normalises multipart form input from the dashboard.

    * empty strings become null for nullable fields (dates, numbers, foreign keys);
    * empty entries are dropped from many-to-many lists;
    * `<file_field>__clear=1` removes an optional file/image.
    """

    def to_internal_value(self, data):
        clears = []
        if isinstance(data, QueryDict):
            normalised = QueryDict(mutable=True)
            for key, values in data.lists():
                if key.endswith(CLEAR_SUFFIX):
                    name = key[: -len(CLEAR_SUFFIX)]
                    field = self.fields.get(name)
                    if isinstance(field, serializers.FileField) and not field.required and values[-1] in ("1", "true"):
                        clears.append(name)
                    continue
                field = self.fields.get(key)
                if isinstance(field, serializers.ManyRelatedField):
                    normalised.setlist(key, [v for v in values if v != ""])
                elif field is not None and field.allow_null and values == [""]:
                    normalised.setlist(key, [None])
                else:
                    normalised.setlist(key, values)
            data = normalised
        result = super().to_internal_value(data)
        for name in clears:
            result.setdefault(name, "")
        return result
