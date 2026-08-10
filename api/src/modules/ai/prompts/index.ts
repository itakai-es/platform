/**
 * Centralized AI Prompts
 * Single source of truth for all prompts used across the application.
 * Frontend sends intent + context, backend builds the full prompt here.
 */

// ============================================================
// OUTPUT LANGUAGE
// ============================================================

const LANGUAGE_NAMES: Record<string, string> = {
  ca: 'Catalan (català)',
  eu: 'Basque (euskara)',
  gl: 'Galician (galego)',
}

/**
 * Directive appended to text prompts so the model writes its output in the
 * class's language. The base prompt templates only exist in Spanish/English
 * (see the `locale === 'en'` branches), so for Catalan/Basque/Galician we keep
 * the Spanish instructions but force the OUTPUT language via this directive.
 * Returns '' for es/en (already native) and for unknown locales.
 */
export function outputLanguageDirective(rawLocale?: string): string {
  const code = (rawLocale || '').toLowerCase().slice(0, 2)
  const name = LANGUAGE_NAMES[code]
  if (!name) return ''
  return `\n\nIMPORTANT: Write your ENTIRE response in ${name}, regardless of the language of these instructions. Translate all natural-language text (titles, descriptions, narrative, headings) into ${name}, while keeping any JSON structure/keys and markdown formatting exactly as specified.`
}

// ============================================================
// BRIEF DEL PROFESOR (compartido por todos los pasos del asistente)
// ============================================================

/**
 * Bloque que se engancha a TODOS los prompts de los asistentes de clase y misión.
 * Lleva las palabras literales del profesor y sus metadatos (asignatura, nivel).
 *
 * Existe porque cada paso construía su contexto por su cuenta y solo los primeros
 * veían lo que el profesor había escrito: a partir de ahí la IA solo conocía la
 * narrativa ya generada. Si el profesor decía "es un proyecto individual" y la
 * narrativa no lo repetía, la guía y los enigmas salían de trabajo en equipo.
 * Con el brief delante, cada paso puede contradecir a la narrativa si hace falta.
 */
export function teacherBriefBlock(brief: string, meta: string, locale: string): string {
  const words = (brief || '').trim().slice(0, 1200)
  const metaLine = (meta || '').trim().slice(0, 200)
  if (!words && !metaLine) return ''

  if (locale === 'en') {
    return `\n\n--- WHAT THE TEACHER ASKED FOR (takes precedence over everything else) ---
${metaLine ? `${metaLine}\n` : ''}${words ? `The teacher's exact words:\n"""\n${words}\n"""\n` : ''}
Respect this above any other part of these instructions and above any narrative or
context you are given: if anything contradicts it, the teacher wins. Pay particular
attention to decisions they have already made — individual vs. pair vs. team work,
number of sessions or duration, age or school year, deliverable format, materials and
assessment — and neither change them nor add the opposite on your own initiative.`
  }

  return `\n\n--- LO QUE HA PEDIDO EL PROFESOR (manda sobre todo lo demás) ---
${metaLine ? `${metaLine}\n` : ''}${words ? `Palabras textuales del profesor:\n"""\n${words}\n"""\n` : ''}
Respeta esto por encima de cualquier otra parte de estas instrucciones y por encima de
la narrativa o el contexto que te pasen: si algo lo contradice, gana el profesor. Fíjate
especialmente en las decisiones que ya ha tomado — trabajo individual, por parejas o en
equipo, número de sesiones o duración, edad o curso, formato de entrega, materiales y
evaluación — y ni las cambies ni añadas lo contrario por tu cuenta.`
}

// ============================================================
// CLASS ONBOARDING
// ============================================================

export const CLASS_NARRATIVE = {
  generate: (idea: string, locale: string) => locale === 'en'
    ? `A teacher says: "${idea}".

Create the gamified worldbuilding for their class. This is a *game world*, not a syllabus adaptation: setting, students' role, factions or houses, atmosphere, rituals, and how challenges are framed as narrative. Use the EXACT theme they asked for. Be creative and inspiring — make the teacher excited to build this class.

CRITICAL RULE: NEVER mention the school subject or any specific curriculum content (mathematics, equations, grammar, verbs, history events, cells, periodic table, etc.). The narrative must work independently of which subject the teacher teaches, so any teacher — regardless of subject — can adopt this world and layer their own content on top. Talk about the game world, roles, factions, atmosphere, progression and stakes. Do NOT talk about the school subject.

Write freely, with your own structure. Use markdown: **bold** for key concepts, ## for sections if needed. Paint a vivid world, give students a role, the atmosphere, the mechanics as story (missions, trials, ascension), and where students progress towards. Only describe factions, houses or teams if the teacher's brief is compatible with group work — if they asked for individual work, frame the world around a solo journey instead. The teacher should read this and think "I NEED to build this world for my classroom".

Do NOT introduce yourself. Start directly with the narrative.`
    : `Un profesor dice: "${idea}".

Crea el worldbuilding gamificado de su clase. Esto es un *mundo de juego*, no una adaptacion del temario: ambientacion, rol del alumno, facciones o casas, atmosfera, rituales, y como los retos se enmarcan como narrativa. Usa la tematica EXACTA que ha pedido. Se creativo e inspirador — que al profesor le entren ganas de crear esta clase.

REGLA CRITICA: NO menciones NUNCA la asignatura ni ningun contenido curricular concreto (matematicas, ecuaciones, gramatica, verbos, hechos historicos, celulas, tabla periodica, etc.). La narrativa tiene que funcionar independientemente de la asignatura que ensene el profesor, de forma que cualquier profesor — sea de la asignatura que sea — pueda adoptar este mundo y poner encima su propio contenido. Habla del mundo del juego, roles, facciones, atmosfera, progresion y stakes. NO hables del contenido de la asignatura.

Escribe libremente, con la estructura que tu quieras. Usa markdown: **negrita** para conceptos clave, ## para secciones si lo necesitas. Pinta un mundo vivido, dale a los alumnos un rol, la atmosfera, las mecanicas como historia (misiones, pruebas, ascenso), y hacia donde progresan los alumnos. Describe facciones, casas o equipos SOLO si encaja con lo que ha pedido el profesor — si ha pedido trabajo individual, monta el mundo como un viaje en solitario. El profesor tiene que leer esto y pensar "NECESITO construir este mundo en mi aula".

NO te presentes. Empieza directamente con la narrativa.`,

  modify: (idea: string, current: string, feedback: string, locale: string) => locale === 'en'
    ? `A teacher is creating a gamified class world. Original idea: "${idea}". Current narrative: "${current}". Teacher says: "${feedback}". Modify the narrative based on their feedback. Keep what works, change what they asked. Preserve the worldbuilding (setting, roles, factions, atmosphere, mechanics as story). CRITICAL: never mention the school subject or specific curriculum content — the world must remain subject-agnostic so any teacher can reuse it. Markdown OK. Start directly.`
    : `Un profesor esta creando el mundo de su clase gamificada. Idea original: "${idea}". Narrativa actual: "${current}". El profesor dice: "${feedback}". Modifica la narrativa segun su feedback. Mantén lo que funciona, cambia lo que ha pedido. Preserva el worldbuilding (ambientacion, roles, facciones, atmosfera, mecanicas como historia). CRITICO: nunca menciones la asignatura ni contenido curricular concreto — el mundo tiene que seguir siendo agnostico a la asignatura para que cualquier profesor pueda reutilizarlo. Markdown OK. Empieza directamente.`,
}

export const CLASS_TITLES = {
  generate: (context: string, locale: string) => locale === 'en'
    ? `Generate exactly 6 class title options based on this context. Real class names suitable for a school. Return ONLY a JSON array of strings. No extra text.\n\nContext: ${context}`
    : `Genera exactamente 6 opciones de titulo para la clase basandote en este contexto. Nombres reales adecuados para un centro educativo. Devuelve SOLO un array JSON de strings. Sin texto extra.\n\nContexto: ${context}`,

  regenerate: (context: string, feedback: string, locale: string) => locale === 'en'
    ? `Generate 6 DIFFERENT class title options. Context: ${context}\nTeacher feedback: "${feedback}"\nReturn ONLY a JSON array of strings.`
    : `Genera 6 opciones de titulo DIFERENTES. Contexto: ${context}\nFeedback del profesor: "${feedback}"\nDevuelve SOLO un JSON array de strings.`,
}

// ============================================================
// MISSION ONBOARDING
// ============================================================

export const MISSION_NARRATIVE = {
  generate: (idea: string, className: string, locale: string) => locale === 'en'
    ? `A teacher wants to create a mission for their class "${className}". They say: "${idea}".

Create the narrative for this gamified mission. Be creative and inspiring — make the teacher excited. Write freely with your own structure. Use markdown: **bold** for key concepts, ## for sections if needed. Paint a vivid scenario, give students a challenge, show how the subject becomes an adventure. Do NOT introduce yourself. Start directly.`
    : `Un profesor quiere crear una misión para su clase "${className}". Dice: "${idea}".

Crea la narrativa para esta misión gamificada. Se creativo e inspirador — que al profesor le entren ganas. Escribe libremente con la estructura que quieras. Usa markdown: **negrita** para conceptos clave, ## para secciones si lo necesitas. Pinta un escenario vivido, dale a los alumnos un reto, muestra como la asignatura se convierte en una aventura. NO te presentes. Empieza directamente.`,

  modify: (idea: string, current: string, feedback: string, locale: string) => locale === 'en'
    ? `A teacher is creating a mission. Idea: "${idea}". Current narrative: "${current}". Teacher says: "${feedback}". Modify the narrative based on feedback. Keep what works, change what they asked. Be creative and inspiring. Markdown OK. Start directly.`
    : `Un profesor está creando una misión. Idea: "${idea}". Narrativa actual: "${current}". El profesor dice: "${feedback}". Modifica la narrativa según su feedback. Mantén lo que funciona, cambia lo que ha pedido. Se creativo e inspirador. Markdown OK. Empieza directamente.`,
}

export const MISSION_TITLES = {
  generate: (context: string, locale: string) => locale === 'en'
    ? `Generate exactly 6 creative titles for a gamified educational MISSION. Do NOT include the class name or subject. Just short, epic mission names.\n\nContext: ${context}\n\nReturn ONLY a JSON array of strings. No extra text.`
    : `Genera exactamente 6 títulos creativos para una MISIÓN educativa gamificada. NO incluyas el nombre de la clase ni la asignatura. Solo nombres cortos y épicos.\n\nContexto: ${context}\n\nDevuelve SOLO un JSON array de strings. Sin texto extra.`,

  regenerate: (context: string, feedback: string, locale: string) => locale === 'en'
    ? `Generate 6 DIFFERENT titles for an educational mission. No class name. Short and creative.\n\nContext: ${context}\nTeacher feedback: "${feedback}"\n\nReturn ONLY a JSON array of strings.`
    : `Genera 6 títulos DIFERENTES para una misión educativa. Sin nombre de clase. Cortos y creativos.\n\nContexto: ${context}\nFeedback del profesor: "${feedback}"\n\nDevuelve SOLO un JSON array de strings.`,
}

/** Qué recursos otorga un enigma (según los que la clase tenga activados). */
export interface EnigmaResources {
  coins?: boolean
  mana?: boolean
}

/** Bloque de guía de recompensas para el prompt, según los recursos activos. Los
 *  valores son SUGERENCIAS: la IA propone, el profesor sobrescribe. */
function enigmaRewardSpec(res: EnigmaResources, en: boolean): string {
  const lines = [
    en
      ? '- xp: one of 20, 40, 60, 80, 100 (20=simple review … 100=final project).'
      : '- xp: uno de 20, 40, 60, 80, 100 (20=repaso sencillo … 100=proyecto final).',
  ]
  if (res.coins)
    lines.push(
      en
        ? '- coins: 0 to 100 in steps of 10, matching the difficulty (0 = no coins).'
        : '- coins: de 0 a 100 en múltiplos de 10, acorde a la dificultad (0 = sin monedas).'
    )
  if (res.mana)
    lines.push(
      en
        ? '- mana: one of 0, 10, 20, 30, 50 by difficulty (0 = no mana).'
        : '- mana: uno de 0, 10, 20, 30, 50 según la dificultad (0 = sin maná).'
    )
  return lines.join('\n')
}

/** Ejemplo de objeto JSON de un enigma, con solo los campos de recurso activos. */
function enigmaJsonShape(res: EnigmaResources, en: boolean): string {
  const desc = en
    ? '"title":"Enigma name","description":"What the student has to do (2-3 sentences)","xp":20'
    : '"title":"Nombre del enigma","description":"Qué tiene que hacer el alumno (2-3 frases)","xp":20'
  const fields = [desc]
  if (res.coins) fields.push('"coins":20')
  if (res.mana) fields.push('"mana":10')
  fields.push(en ? '"objectives":["Objective 1","Objective 2"]' : '"objectives":["Objetivo 1","Objetivo 2"]')
  return `[{${fields.join(',')}}]`
}

export const MISSION_ENIGMAS = {
  generate: (idea: string, narrative: string, title: string, className: string, locale: string, res: EnigmaResources = {}) => locale === 'en'
    ? `You are an educational activity designer. The teacher has this mission for the class "${className}":

Idea: ${idea}
Narrative: ${narrative.slice(0, 600)}
Title: ${title}

Generate exactly 4 ENIGMAS (real activities/tasks students must complete). Each enigma is a concrete, practical activity.

Each enigma grants these rewards (scale them to the enigma's difficulty):
${enigmaRewardSpec(res, true)}

Each enigma has objectives (list of learning objectives, 2-3 per enigma).

Return ONLY a JSON array:
${enigmaJsonShape(res, true)}

ONLY the JSON, nothing else.`
    : `Eres un diseñador de actividades educativas. El profesor tiene esta misión para la clase "${className}":

Idea: ${idea}
Narrativa: ${narrative.slice(0, 600)}
Título: ${title}

Genera exactamente 4 ENIGMAS (actividades/tareas reales que los alumnos deben completar). Cada enigma es una actividad concreta y práctica.

Cada enigma otorga estas recompensas (escálalas según la dificultad del enigma):
${enigmaRewardSpec(res, false)}

Cada enigma tiene objectives (lista de objetivos de aprendizaje, 2-3 por enigma).

Responde SOLO con un JSON array:
${enigmaJsonShape(res, false)}

SOLO el JSON, nada más.`,

  regenerate: (context: string, currentEnigmas: string, feedback: string, className: string, locale: string, res: EnigmaResources = {}) => locale === 'en'
    ? `Mission for class "${className}": ${context}.\n\nCurrent enigmas: ${currentEnigmas}\n\nTeacher says: "${feedback}".\n\nModify the enigmas based on feedback. Rewards per enigma:\n${enigmaRewardSpec(res, true)}\n\nReturn ONLY a JSON array:\n${enigmaJsonShape(res, true)}\nONLY the JSON.`
    : `Misión para la clase "${className}": ${context}.\n\nEnigmas actuales: ${currentEnigmas}\n\nEl profesor dice: "${feedback}".\n\nMODIFICA los enigmas según su feedback. Recompensas por enigma:\n${enigmaRewardSpec(res, false)}\n\nResponde SOLO con un JSON array:\n${enigmaJsonShape(res, false)}\nSOLO el JSON.`,
}

// ============================================================
// CLASS GUIDE
// ============================================================

export const CLASS_GUIDE = {
  generate: (title: string, context: string, locale: string) => locale === 'en'
    ? `Create a student guide for the class "${title}". Context: ${context}.\n\nInclude: ## Welcome, ## Schedule, ## Evaluation Criteria (percentages), ## Rules, ## How this class works (gamification). Keep it SHORT (max 400 words). Markdown format. Motivating tone. Start directly.`
    : `Crea una guía del alumno para la clase "${title}". Contexto: ${context}.\n\nIncluye: ## Bienvenida, ## Horario, ## Criterios de evaluación (porcentajes), ## Normas, ## Cómo funciona esta clase (gamificación). Que sea BREVE (máx 400 palabras). Formato Markdown. Tono motivador. Empieza directamente.`,
}

// ============================================================
// MISSION GUIDE (briefing for students)
// ============================================================

export const MISSION_GUIDE = {
  generate: (title: string, narrative: string, enigmasSummary: string, totalXp: number, locale: string) => locale === 'en'
    ? `Create a student briefing for the mission "${title}". Narrative: ${narrative.slice(0, 400)}. Enigmas: ${enigmasSummary}.\n\nInclude: ## Your Mission (epic summary), ## Enigmas (brief description without spoilers), ## Rewards (Total XP: ${totalXp}), ## Tips (2-3 tips). SHORT (max 300 words). Epic and motivating tone. Markdown. Start directly.`
    : `Crea un briefing para los alumnos de la misión "${title}". Narrativa: ${narrative.slice(0, 400)}. Enigmas: ${enigmasSummary}.\n\nIncluye: ## Tu Misión (resumen épico de lo que van a hacer), ## Enigmas (breve descripción de cada reto sin spoilers), ## Recompensas (XP total: ${totalXp}), ## Consejos (2-3 tips). BREVE (máx 300 palabras). Tono épico y motivador. Markdown. Empieza directamente.`,
}

// ============================================================
// BADGE GENERATION
// ============================================================

export const BADGE_GENERATE = {
  nameAndDescription: (context: string, locale: string) => locale === 'en'
    ? `Generate a creative name and description for an educational badge/achievement.\n- Name: 3-5 epic, creative words\n- Description: 1 short sentence (max 12 words), describes the achievement that unlocks the badge\n${context ? `\nContext: ${context}` : ''}\n\nReturn ONLY a JSON: {"name":"...","description":"..."}\nONLY the JSON.`
    : `Genera un nombre y descripción creativos para una insignia/logro educativo.\n- Nombre: 3-5 palabras épicas y creativas\n- Descripción: 1 frase corta (máx 12 palabras), describe el logro que desbloquea la insignia\n${context ? `\nContexto: ${context}` : ''}\n\nResponde SOLO con un JSON: {"name":"...","description":"..."}\nSOLO el JSON.`,
}

// ============================================================
// MARKDOWN EDITOR (AI assistant for editing content)
// ============================================================

export const EDITOR_ASSIST = {
  generate: (content: string, request: string, systemContext: string, locale: string) => locale === 'en'
    ? `${systemContext}\nCurrent text:\n"""\n${content.slice(0, 1500)}\n"""\nThe teacher asks: "${request}"\nGenerate ONLY the new/modified content in markdown. Use **bold**, *italic*, ## headings, - lists. No explanations, no quotes. Start directly.`
    : `${systemContext}\nTexto actual:\n"""\n${content.slice(0, 1500)}\n"""\nEl profesor pide: "${request}"\nGenera SOLO el contenido nuevo/modificado en markdown. Usa **negrita**, *cursiva*, ## titulos, - listas. Sin explicaciones, sin comillas. Empieza directamente.`,
}

// ============================================================
// ENIGMA EDITOR (AI assistant in enigma form modal)
// ============================================================

// ============================================================
// AVATAR GENERATION (wardrobe + background prompt splitting)
// ============================================================

export const AVATAR_PROMPTS = {
  wardrobe: (classHint: string) =>
    'You are a wardrobe prompt generator for closed-catalog educational avatars.\n\n' +
    'Your task is to transform a user request into one short wardrobe prompt for an image editing model.\n\n' +
    'IMPORTANT:\n' +
    '- Return only the wardrobe prompt.\n' +
    '- Do not add explanations.\n' +
    '- Do not add quotes.\n' +
    '- Do not mention the avatar name.\n' +
    '- Do not describe background, scenery, environment, camera, framing, or composition.\n' +
    '- Focus only on clothing, wearable accessories, and light pose cues.\n\n' +
    'RULES:\n' +
    '- Keep it compact and concrete.\n' +
    '- Mention clothes first, then accessories, then pose.\n' +
    '- Use language like: wearing..., with..., and...\n' +
    '- Keep the character full body, readable, and standing unless the user explicitly asks for something else.\n' +
    '- Preserve the same identity, same face, same body, and same character.\n' +
    '- Avoid style meta-instructions such as "flat vector", "photorealistic", or "cinematic".\n' +
    '- Avoid identity changes such as different skin, different face, different age, different species, different body type, or different character.\n' +
    '- Avoid scenery words such as room, forest, street, city, temple, station, background, sky, or corridor.\n' +
    '- Avoid complex action choreography unless the user explicitly asks for it.\n\n' +
    'GOOD OUTPUT EXAMPLE:\nwearing a structured firefighter coat, rescue gloves, utility belt, reinforced boots, and a ready-to-move alert pose\n\n' +
    'GOOD OUTPUT EXAMPLE:\nwearing a red and gold armored avenger suit with a circular chest reactor, reinforced gauntlets, armored boots, and a strong heroic standing pose\n\n' +
    'BAD OUTPUT EXAMPLE:\na firefighter in a station with dramatic lighting and smoke everywhere\n\n' +
    'BAD OUTPUT EXAMPLE:\na red and gold superhero flying across a futuristic city' +
    classHint,

  background: (classHint: string) =>
    'You are a background prompt generator for closed-catalog educational avatars.\n\n' +
    'Your task is to transform a user request into one short background prompt for an image generation model.\n\n' +
    'IMPORTANT:\n' +
    '- Return only the background prompt.\n' +
    '- Do not add explanations.\n' +
    '- Do not add quotes.\n' +
    '- Do not mention the avatar name.\n' +
    '- Do not describe a hero character, foreground person, or central protagonist.\n' +
    '- The result must be an environment plate for later compositing.\n\n' +
    'RULES:\n' +
    '- Describe only environment, architecture, props, and atmosphere.\n' +
    '- No main character. No foreground person. No central protagonist.\n' +
    '- Prefer spaces with an open central or readable zone.\n' +
    '- Keep it compact and concrete.\n' +
    '- Avoid camera jargon unless absolutely necessary.\n' +
    '- Avoid text, logos, signage, UI, or interface elements.\n' +
    '- Avoid describing actions performed by a hero.\n' +
    '- Prefer locations that visually support the wardrobe/theme without stealing attention from the avatar.\n\n' +
    'GOOD OUTPUT EXAMPLE:\nan empty firefighter training hall with rescue platforms, ladders, hose stations, equipment bays, and a clean open central area\n\n' +
    'GOOD OUTPUT EXAMPLE:\nan empty high-tech hero command hangar with metallic platforms, advanced wall panels, red and gold accents, and a clean open central area\n\n' +
    'BAD OUTPUT EXAMPLE:\na firefighter hero standing in the middle of a busy fire station\n\n' +
    'BAD OUTPUT EXAMPLE:\nan iron-man-style hero flying through the center of a futuristic base' +
    classHint,
}

// ============================================================
// COVER IMAGE (class & mission cover generation)
// ============================================================

export const COVER_IMAGE = {
  /** System prompt for Gemini scene description (step 1) */
  sceneSystem: `You are a prompt generator for cinematic image generation.

Your task is to read a story or lesson written by a teacher and transform it into a single cinematic scene description that will be used to generate an image.

IMPORTANT:
- You are NOT generating the full image prompt
- You are ONLY generating the scene description

GOAL:
Create a visually powerful, cinematic, narrative moment that feels like a frame from a series or movie.

RULES:

1. OUTPUT FORMAT:
Return ONLY one sentence or short paragraph describing the scene.
Do NOT add explanations.
Do NOT add formatting.
Do NOT add quotes.

2. CINEMATIC THINKING:
- The scene must feel like a moment in time (not generic)
- Characters must be doing something (not posing)
- There must be intention, tension or movement
- Think like a movie scene, not an illustration

3. GAMIFICATION:
- Include roles (leader, explorer, strategist, etc.) if present
- Include progression, challenge, discovery or system interaction
- If powers exist, describe them subtly (not flashy)

4. VISUAL LANGUAGE:
- Describe environment + characters + action
- Include scale (big structures vs small characters)
- Include spatial context (left/right, foreground/background if useful)

5. STYLE CONSTRAINTS (VERY IMPORTANT):
- DO NOT mention UI, interface, dashboards, or text
- DO NOT mention "vector", "flat", or technical style words
- DO NOT describe lighting effects like glow or realism
- DO NOT use childish or cartoon language
- DO NOT include any books, scrolls, banners, signs or surfaces with writing

6. TONE:
- Serious, immersive, slightly epic
- Not playful, not childish

7. AVOID:
- Generic phrases like "a scene showing..."
- Static descriptions like "standing"
- Over-explaining`,

  /** Final cinematic image prompt (step 2) — sent to Spark/Flux */
  buildCinematic: (sceneDescription: string) => `A cinematic flat vector scene of -${sceneDescription}

SCENE INTENT:
this is a story moment, not a static illustration, not a UI background
the scene must feel alive, as if paused mid-action inside a series

STYLE:
flat vector illustration, modern clean system, SVG-like, no gradients, no textures, no realism, no outlines or extremely thin outlines only

CINEMATIC LANGUAGE:
cinematic composition, not centered, not symmetrical
off-center framing, dynamic balance
foreground, midground and background clearly separated
use visual tension and asymmetry

CAMERA:
slightly low angle or angled perspective
never flat frontal view
frame must feel like a shot, not a diagram

DEPTH:
foreground: partially cropped shapes (terrain, structures, objects) to create immersion
midground: main action (characters and interaction)
background: large simplified shapes (architecture, sky, environment)
clear scale differences between layers

CHARACTERS:
1–5 characters integrated into the scene (not posing, mid-action)
roles implied (leader, explorer, controller, builder, etc.)
proportions slightly stylized but grounded (no big heads)
minimal facial features, neutral or serious expressions
body language conveys intention, not emotion exaggeration

GAMIFICATION ELEMENTS:
each character may have subtle abilities or powers:
- curved lines flowing around limbs
- orbiting geometric shapes (circles, fragments)
- slight distortion of nearby elements (bent lines, shifted blocks)
powers must be flat, minimal, integrated into environment (no glow, no FX)

ENVIRONMENT:
large-scale environment that defines the world:
- architecture, terrain or system structures
- abstract but meaningful (fortress, system, arena, path, etc.)
- simplified into geometric and organic shapes
- avoid decorative noise

STRUCTURE:
use composition to guide the eye:
- directional lines
- paths
- vertical or diagonal flows
the viewer must “read” the scene naturally

SHAPES:
clean, controlled curves
slightly sharper than childish style
no random forms
everything intentional

COLOR SYSTEM:
strictly flat colors only (no gradients ever)
use controlled cinematic palette:
- deep dark base tones (navy, dark blue, deep green)
- mid tones (muted purple, teal, stone)
- limited accent colors (gold, coral, soft neon)
contrast used to create focus, not lighting

LIGHTING:
no realistic lighting, no glow
only color blocking and contrast to separate planes

DETAIL LEVEL:
medium detail but controlled
no clutter, no micro-detail, no noise
each element must serve composition

MOOD:
immersive, intelligent, slightly epic, controlled
never playful, never childish

RENDER STYLE:
ultra clean vector, sharp edges, scalable, consistent system

CONSISTENCY:
all elements must feel part of the same visual language and design system

CRITICAL RULES:
this must feel like a cinematic frame, not an illustration, not a UI screen

NEGATIVE PROMPT:
text, letters, numbers, logos, UI elements, interface components, centered composition, symmetry, static posing, childish style, cute expressions, exaggerated proportions, gradients, glow effects, fantasy particles, photorealism, textures, noise, blur`,
}

// ============================================================
// BADGE IMAGE (achievement badge generation)
// ============================================================

export const BADGE_IMAGE = {
  build: (theme: string) => `A circular achievement badge icon for a gamified educational platform. Theme: ${theme.slice(0, 200)}.

STYLE: flat vector badge design, circular shape, centered single symbol or icon, bold colors, clean minimal design, no text, no letters, no numbers, no words.

COMPOSITION: circular badge with a colored gradient background circle, a single centered iconic symbol representing the achievement, subtle decorative elements (small stars, laurel wreath, or geometric accents), slight drop shadow for depth.

COLOR: rich saturated gradient background (purple-to-blue, red-to-orange, green-to-teal, or gold-to-amber depending on theme), white or gold accent elements, high contrast between background and icon.

MUST: look like a game achievement badge, be recognizable at small sizes (64x64px), feel premium and collectible, suitable for students.

AVOID: text, letters, numbers, realistic style, photographs, complex scenes, multiple characters, busy backgrounds, childish cartoon style.

RENDER: ultra clean vector, sharp edges, flat colors with subtle gradients only on the background circle.`,
}

// ============================================================
// FALLBACK COVER (when no scene description / non-covers types)
// ============================================================

export const FALLBACK_IMAGE = {
  build: (theme: string, locale: string) => locale === 'en'
    ? `A cinematic flat vector illustration for an educational context. Theme: ${theme.slice(0, 300)}. Style: flat vector, clean, modern, no text in the image.`
    : `A cinematic flat vector illustration for an educational context. Tema: ${theme.slice(0, 300)}. Style: flat vector, clean, modern, no text in the image.`,
}

// ============================================================
// ENIGMA EDITOR (AI assistant in enigma form modal)
// ============================================================

export const ENIGMA_ASSIST = {
  modify: (currentEnigma: string, missionContext: string, request: string, locale: string) => locale === 'en'
    ? `I'm editing an enigma (activity/challenge) of an educational mission.${missionContext ? `\nMission context: ${missionContext}` : ''}\n\nCurrent enigma: ${currentEnigma}\n\nTeacher says: "${request}"\n\nModify the enigma based on their request. XP can ONLY be: 20 (easy), 40 (medium), 60 (research), 80 (complex), 100 (final project). Return ONLY a JSON: {"title":"...","description":"...","xp":40,"objectives":["...","..."]}. ONLY the JSON.`
    : `Estoy editando un enigma (actividad/reto) de una misión educativa.${missionContext ? `\nContexto de la misión: ${missionContext}` : ''}\n\nEnigma actual: ${currentEnigma}\n\nEl profesor dice: "${request}"\n\nModifica el enigma según su petición. XP SOLO puede ser: 20 (fácil), 40 (medio), 60 (investigación), 80 (complejo), 100 (proyecto final). Devuelve SOLO un JSON: {"title":"...","description":"...","xp":40,"objectives":["...","..."]}. SOLO el JSON.`,
}
