# Taller de versículos

App independiente para preparar fichas visuales de memorización bíblica.

## Ejecutar

Desde el directorio raíz del proyecto:

```bash
python3 -m http.server 8080
```

Abre `http://localhost:8080/memory/`.

## Funciones

- Carga directa de un versículo o de un rango del mismo capítulo en RVR1960 o NTV, sin registro (por ejemplo, `Efesios 2:8-9`).
- Selección individual o rectangular de palabras.
- Color base configurable y coloración de palabras mediante una paleta o un color personalizado.
- Selector de emojis organizado por categorías, además de emojis escritos por el usuario.
- Sustitución mediante archivos PNG, reducidos automáticamente para el guardado local.
- Los PNG pueden adjuntarse o pegarse directamente desde el portapapeles.
- Atajos: `Supr` restaura las palabras seleccionadas y `Enter` las deselecciona.
- El emoji conserva el ancho tipográfico de la palabra escondida.
- Cinco tipografías de impresión joviales y legibles.
- Cálculo automático del mayor tamaño que cabe en un A4 horizontal.
- Impresión progresiva: primera hoja sin reemplazos, solo con colores; después una hoja adicional por cada emoji o PNG hasta mostrarlos todos.
- Impresión limpia: solamente el versículo, sin cabecera, referencia ni bordes.
- Guardado automático en el navegador.
