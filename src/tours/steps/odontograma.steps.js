export const odontogramaSteps = [
  {
    target: '[data-tour="odontograma-canvas"]',
    title: 'El odontograma',
    content: 'Cada diente se dibuja acá. Para marcar algo, primero elegís QUÉ marcar en la barra de arriba y después hacés click sobre el diente. Te mostramos un ejemplo completo en los próximos pasos.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="odontograma-modo-restauracion"]',
    title: 'Paso 1: elegí qué marcar',
    content: 'Probá ahora: hacé click en "Rest. existente" para activar ese modo de marcado. Cuando lo tengas activo, pasá al siguiente paso.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="odontograma-canvas"]',
    title: 'Paso 2: marcá un diente',
    content: 'Con el modo activo, hacé click sobre cualquier diente del dibujo para aplicarle la marca. En cuanto lo hagas, se va a abrir un cartel para agregar una nota clínica.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="odontograma-nota-modal"]',
    title: 'Paso 3: agregá una nota',
    content: 'Escribí una descripción del procedimiento (por ejemplo: "Restauración composite cara vestibular") y tocá "Agregar nota". Si no querés agregarla ahora, podés tocar "Omitir".',
    placement: 'top',
    targetWaitTimeout: 6000,
  },
  {
    target: '[data-tour="odontograma-tabla-notas"]',
    title: 'Historial de notas',
    content: 'Todas las notas que vayas agregando quedan acá, organizadas por diente y fecha. Podés editarlas o eliminarlas cuando quieras.',
    placement: 'top',
    targetWaitTimeout: 6000,
  },
  {
    target: '[data-tour="odontograma-acciones"]',
    title: 'Guardar y exportar',
    content: 'No te olvides de tocar "Guardar" para no perder los cambios. También podés descargar el odontograma como imagen PNG o exportarlo a PDF junto con el historial de notas.',
    placement: 'top',
  },
];
