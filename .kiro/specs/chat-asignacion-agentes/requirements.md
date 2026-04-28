# Documento de Requerimientos — Chat de Asignación Inteligente de Agentes

## Introducción

Este documento define los requerimientos para una aplicación de Chat Web que implementa los principios del Working Backwards de la Plataforma Integral de Asignación Inteligente (PIAI). El chatbot perfila a un prospecto recopilando datos de contacto, domicilio, perfil socioeconómico (a través de ingresos mensuales) y tipo de seguro buscado. Con esa información, la aplicación busca en una base de datos de agentes al más adecuado, integrando los conceptos de Agente Espejo (afinidad socioeconómica), Radio de Confianza (proximidad geográfica), Cartera Viva (disponibilidad del agente) y Especialista en Tu Momento (especialización técnica por ramo).

El sistema también incluye una base de datos semilla de agentes con campos específicos, donde el segmento de cartera y la prima promedio se correlacionan con la tabla de Niveles Socioeconómicos (NSE) de referencia.

## Glosario

- **Chatbot**: Interfaz conversacional web que guía al prospecto a través de un flujo de preguntas para recopilar su perfil.
- **Prospecto**: Persona que interactúa con el Chatbot buscando contratar un seguro.
- **Agente**: Asesor de seguros registrado en la Base_de_Datos_de_Agentes con perfil, especialización y disponibilidad.
- **Base_de_Datos_de_Agentes**: Repositorio persistente que almacena los registros de agentes con sus atributos de perfil, especialización y cartera.
- **Perfil_Prospecto**: Conjunto de datos recopilados del prospecto: datos de contacto, domicilio, ingreso mensual, nivel socioeconómico inferido y tipo de seguro buscado.
- **NSE**: Nivel Socioeconómico según la clasificación de referencia (A/B, C+, C, C−, D+, D, E) definida en `./00-ref/tabla_nse.csv`.
- **Ramo_Especialidad**: Tipo de seguro en el que un agente se especializa. Valores posibles: VidaProtección, GMM, VidaAhorro.
- **Segmento_Cartera**: Clasificación socioeconómica del segmento de clientes que atiende un agente, alineada con los niveles NSE.
- **Prima_Promedio_Poliza**: Valor decimal que representa el costo promedio de las pólizas que maneja un agente, correlacionado con su Segmento_Cartera.
- **Motor_de_Asignacion**: Componente lógico que evalúa la compatibilidad entre el Perfil_Prospecto y los registros de la Base_de_Datos_de_Agentes para seleccionar al agente más adecuado.
- **Flujo_Conversacional**: Secuencia ordenada de preguntas y validaciones que el Chatbot ejecuta para construir el Perfil_Prospecto.
- **Seed_Script**: Script que genera los datos iniciales de la Base_de_Datos_de_Agentes con valores aleatorios pero correlacionados según la tabla NSE.

## Requerimientos

### Requerimiento 1: Interfaz de Chat Web

**Historia de Usuario:** Como prospecto, quiero interactuar con un chatbot en una interfaz web, para poder proporcionar mis datos y recibir la asignación de un agente de forma conversacional.

#### Criterios de Aceptación

1. THE Chatbot SHALL presentar una interfaz web conversacional con un campo de entrada de texto y un área de visualización de mensajes.
2. THE Chatbot SHALL mostrar los mensajes del prospecto alineados a la derecha y los mensajes del sistema alineados a la izquierda, diferenciados visualmente.
3. THE Chatbot SHALL iniciar la conversación con un mensaje de bienvenida que explique el propósito del sistema y solicite permiso para comenzar el perfilamiento.
4. WHEN el prospecto envía un mensaje, THE Chatbot SHALL mostrar un indicador de escritura antes de presentar la respuesta del sistema.
5. THE Chatbot SHALL ser responsivo y funcionar correctamente en navegadores de escritorio y dispositivos móviles.

### Requerimiento 2: Recopilación de Datos de Contacto

**Historia de Usuario:** Como prospecto, quiero proporcionar mis datos de contacto al chatbot, para que el agente asignado pueda comunicarse conmigo.

#### Criterios de Aceptación

1. THE Chatbot SHALL solicitar al prospecto su nombre completo como primer dato de contacto.
2. WHEN el prospecto proporciona su nombre, THE Chatbot SHALL solicitar un número de teléfono de 10 dígitos.
3. WHEN el prospecto proporciona un número de teléfono, THE Chatbot SHALL solicitar una dirección de correo electrónico.
4. IF el prospecto proporciona un número de teléfono con formato inválido (diferente de 10 dígitos numéricos), THEN THE Chatbot SHALL informar el error y solicitar el dato nuevamente.
5. IF el prospecto proporciona un correo electrónico con formato inválido, THEN THE Chatbot SHALL informar el error y solicitar el dato nuevamente.

### Requerimiento 3: Recopilación de Domicilio

**Historia de Usuario:** Como prospecto, quiero proporcionar mi domicilio al chatbot, para que el sistema pueda considerar mi ubicación geográfica en la asignación del agente.

#### Criterios de Aceptación

1. THE Chatbot SHALL solicitar al prospecto su estado de residencia.
2. WHEN el prospecto proporciona su estado, THE Chatbot SHALL solicitar su ciudad o municipio.
3. WHEN el prospecto proporciona su ciudad, THE Chatbot SHALL solicitar su colonia y código postal.
4. THE Chatbot SHALL almacenar el domicilio completo (estado, ciudad, colonia, código postal) como parte del Perfil_Prospecto.

### Requerimiento 4: Perfilamiento Socioeconómico

**Historia de Usuario:** Como prospecto, quiero indicar mi rango de ingreso mensual, para que el sistema determine mi nivel socioeconómico y me asigne un agente con afinidad a mi contexto.

#### Criterios de Aceptación

1. THE Chatbot SHALL solicitar al prospecto su ingreso mensual aproximado presentando los rangos definidos en la tabla NSE como opciones seleccionables.
2. WHEN el prospecto selecciona un rango de ingreso, THE Motor_de_Asignacion SHALL clasificar al prospecto en el NSE correspondiente según la tabla de referencia: A/B ($78,700 o más), C+ ($41,200 a $78,700), C ($31,800 a $41,200), C− ($21,500 a $31,800), D+ ($15,100 a $21,500), D ($5,600 a $15,100), E ($0 a $5,600).
3. THE Chatbot SHALL presentar los rangos de ingreso de forma clara y sin juicios de valor, utilizando únicamente los montos numéricos.
4. IF el prospecto no desea proporcionar su ingreso, THEN THE Chatbot SHALL informar que este dato es necesario para una asignación óptima y ofrecer la opción de continuar sin este dato con una asignación genérica.

### Requerimiento 5: Selección de Tipo de Seguro

**Historia de Usuario:** Como prospecto, quiero indicar qué tipo de seguro estoy buscando, para que el sistema me conecte con un agente especializado en ese ramo.

#### Criterios de Aceptación

1. THE Chatbot SHALL presentar al prospecto las tres opciones de ramo de seguro: VidaProtección, GMM (Gastos Médicos Mayores) y VidaAhorro.
2. THE Chatbot SHALL incluir una descripción breve de cada ramo para ayudar al prospecto a identificar su necesidad.
3. WHEN el prospecto selecciona un ramo de seguro, THE Chatbot SHALL almacenar la selección como parte del Perfil_Prospecto.
4. IF el prospecto indica que no sabe qué tipo de seguro necesita, THEN THE Chatbot SHALL realizar preguntas adicionales sobre sus preocupaciones principales (proteger a la familia, cubrir gastos médicos, ahorrar para el futuro) para inferir el ramo más adecuado.

### Requerimiento 6: Motor de Asignación de Agente

**Historia de Usuario:** Como prospecto, quiero que el sistema encuentre al agente más adecuado para mi perfil, para recibir asesoría personalizada y relevante.

#### Criterios de Aceptación

1. WHEN el Perfil_Prospecto está completo, THE Motor_de_Asignacion SHALL buscar en la Base_de_Datos_de_Agentes al agente con mayor compatibilidad.
2. THE Motor_de_Asignacion SHALL evaluar la compatibilidad considerando tres criterios ponderados: coincidencia de Ramo_Especialidad con el tipo de seguro solicitado, coincidencia de Segmento_Cartera con el NSE del prospecto, y coincidencia geográfica de domicilio_estado con el estado del prospecto.
3. WHEN existen múltiples agentes con compatibilidad equivalente, THE Motor_de_Asignacion SHALL seleccionar al agente con la Prima_Promedio_Poliza más cercana al rango esperado para el NSE del prospecto.
4. IF no existe un agente con coincidencia en los tres criterios, THEN THE Motor_de_Asignacion SHALL relajar los criterios en orden de prioridad: primero geografía, luego segmento socioeconómico, manteniendo siempre la coincidencia de Ramo_Especialidad.
5. THE Motor_de_Asignacion SHALL completar la búsqueda y selección en un tiempo inferior a 3 segundos.

### Requerimiento 7: Presentación del Agente Asignado

**Historia de Usuario:** Como prospecto, quiero conocer los datos del agente asignado, para poder contactarlo y sentir confianza en la asignación.

#### Criterios de Aceptación

1. WHEN el Motor_de_Asignacion selecciona un agente, THE Chatbot SHALL presentar al prospecto los datos del agente: nombre completo, teléfono, correo electrónico y ramo de especialidad.
2. THE Chatbot SHALL presentar un mensaje que explique por qué ese agente fue seleccionado, mencionando los criterios de afinidad identificados (ubicación, perfil socioeconómico, especialización).
3. THE Chatbot SHALL ofrecer al prospecto la opción de solicitar un agente diferente si no se siente cómodo con la asignación.
4. WHEN el prospecto acepta al agente asignado, THE Chatbot SHALL mostrar un mensaje de cierre con instrucciones sobre los siguientes pasos del proceso.

### Requerimiento 8: Base de Datos Semilla de Agentes

**Historia de Usuario:** Como desarrollador, quiero contar con un script de generación de datos semilla para la base de datos de agentes, para poder probar el sistema con datos realistas y correlacionados.

#### Criterios de Aceptación

1. THE Seed_Script SHALL generar registros de agentes con los siguientes campos: id_agente (alfanumérico aleatorio de 10 caracteres), nombre_completo (máximo 150 caracteres, combinaciones de nombre y apellido mexicanos), telefono (15 caracteres, formato de teléfono mexicano), correo (correo electrónico aleatorio), domicilio_estado (cadena con calle, número, localidad, estado y código postal), ramo_especialidad (VidaProtección, GMM o VidaAhorro), segmento_cartera (A/B, C+, C, C−, D+, D o E) y prima_promedio_poliza (decimal(15,6) entre 12,000 y 6,000,000).
2. THE Seed_Script SHALL correlacionar el valor de segmento_cartera con prima_promedio_poliza de acuerdo con el NSE: segmento A/B con primas entre 3,000,000 y 6,000,000; segmento C+ con primas entre 1,500,000 y 3,000,000; segmento C con primas entre 800,000 y 1,500,000; segmento C− con primas entre 400,000 y 800,000; segmento D+ con primas entre 150,000 y 400,000; segmento D con primas entre 50,000 y 150,000; segmento E con primas entre 12,000 y 50,000.
3. THE Seed_Script SHALL generar un mínimo de 50 registros de agentes distribuidos entre los siete segmentos de cartera y los tres ramos de especialidad.
4. THE Seed_Script SHALL generar números de teléfono con formato mexicano válido (prefijo +52 seguido de 10 dígitos).
5. THE Seed_Script SHALL generar domicilios con estados de la República Mexicana reales.

### Requerimiento 9: Resumen de Perfil del Prospecto

**Historia de Usuario:** Como prospecto, quiero ver un resumen de mis datos antes de la asignación, para confirmar que la información proporcionada es correcta.

#### Criterios de Aceptación

1. WHEN el Chatbot ha recopilado todos los datos del Perfil_Prospecto, THE Chatbot SHALL presentar un resumen con: nombre, teléfono, correo, domicilio, rango de ingreso (sin mostrar el NSE clasificado) y tipo de seguro seleccionado.
2. THE Chatbot SHALL solicitar al prospecto confirmación explícita de que los datos son correctos.
3. WHEN el prospecto confirma los datos, THE Chatbot SHALL enviar el Perfil_Prospecto al Motor_de_Asignacion.
4. IF el prospecto indica que algún dato es incorrecto, THEN THE Chatbot SHALL permitir la corrección del dato específico sin reiniciar todo el flujo conversacional.

### Requerimiento 10: Manejo de Errores y Casos Límite

**Historia de Usuario:** Como prospecto, quiero que el chatbot maneje situaciones inesperadas de forma amigable, para no perder el progreso de mi conversación.

#### Criterios de Aceptación

1. IF el prospecto envía un mensaje que no corresponde a la pregunta actual del flujo, THEN THE Chatbot SHALL reiterar la pregunta de forma amigable e indicar qué tipo de respuesta se espera.
2. IF ocurre un error de conexión con la Base_de_Datos_de_Agentes, THEN THE Chatbot SHALL informar al prospecto que el sistema está temporalmente no disponible y sugerir intentar nuevamente en unos minutos.
3. IF el Motor_de_Asignacion no encuentra ningún agente compatible, THEN THE Chatbot SHALL informar al prospecto y ofrecer la opción de dejar sus datos para ser contactado manualmente por un coordinador.
4. WHILE el prospecto se encuentra en medio del Flujo_Conversacional, THE Chatbot SHALL preservar el estado de la conversación ante recargas accidentales de la página durante la sesión activa.
