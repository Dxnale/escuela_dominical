# Voces

Aplicación web para preparar lecturas bíblicas dramatizadas. Permite cargar un pasaje, asignar palabras a personajes mediante color y generar una hoja general más una hoja individual para cada participante.

## Ejecutar

No necesita instalar dependencias. Desde esta carpeta, inicia cualquier servidor estático, por ejemplo:

```bash
python3 -m http.server 8080
```

Después abre `http://localhost:8080`.

## Cargar traducciones

Selecciona RVR1960 o NTV y carga una referencia como `Juan 3:1-12`. No hace falta crear una cuenta ni configurar una clave: la aplicación consulta la [API pública de Midvash](https://github.com/midvash/bible-api), que permite peticiones directas desde el navegador.

Los textos no se almacenan en este repositorio y se muestra el aviso de copyright correspondiente. Si la conexión no estuviera disponible, usa **Pegar texto**; la edición, los colores y la impresión funcionan igual.

## Uso

- Añade un personaje y elige su color en la columna izquierda.
- Selecciónalo y haz clic o arrastra sobre sus palabras.
- Usa **Borrar asignación** para corregir fragmentos.
- Pulsa el círculo de color de un personaje para cambiarlo.
- En **Imprimir hojas**, selecciona tipografía, variante regular/bold y tamaño.

El proyecto se guarda automáticamente en el almacenamiento local del navegador. Al imprimir se genera una página completa y otra por cada personaje, atenuando en cada guion individual el texto que pertenece a las demás voces.
