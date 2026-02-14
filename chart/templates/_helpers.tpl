{{/*
Common name
*/}}
{{- define "asylguiden.name" -}}
asylguiden
{{- end }}

{{/*
Common labels
*/}}
{{- define "asylguiden.labels" -}}
app.kubernetes.io/managed-by: Helm
app.kubernetes.io/part-of: asylguiden
{{- end }}

{{/*
Selector labels
*/}}
{{- define "asylguiden.selectorLabels" -}}
app.kubernetes.io/name: {{ . }}
app.kubernetes.io/part-of: asylguiden
{{- end }}
