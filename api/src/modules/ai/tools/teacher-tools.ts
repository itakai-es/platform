import { SchemaType } from '@google/generative-ai'
import { registerTool } from './tool-registry.js'
import { getAIProvider } from '../providers/index.js'
import { generateNarrative } from '../generators/narrative.js'
import { generateQuiz } from '../generators/quiz.js'
import { generateImage } from '../generators/image.js'
import { prisma } from '../../../config/database.js'
import { nanoid } from 'nanoid'

/**
 * Register teacher-only tools that agents can invoke via function calling.
 * These wrap the existing generators + CRUD operations as callable tools.
 */
export function registerTeacherTools() {
  const provider = getAIProvider()

  registerTool('generate_narrative', {
    declaration: {
      name: 'generate_narrative',
      description: 'Generate a gamified mission narrative for a class topic. Use when the teacher asks to create a mission narrative, story or adventure.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          topic: { type: SchemaType.STRING, description: 'The topic or subject for the narrative' },
          locale: { type: SchemaType.STRING, description: 'Language: es or en' },
        },
        required: ['topic'],
      },
    },
    async execute(args) {
      const result = await generateNarrative(provider, {
        prompt: String(args.topic),
        locale: String(args.locale || 'es'),
      })
      return result.text
    },
  })

  registerTool('generate_quiz', {
    declaration: {
      name: 'generate_quiz',
      description: 'Generate quiz enigmas with XP values for a topic. Use when the teacher asks to create enigmas, quiz, questions or an exam.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          topic: { type: SchemaType.STRING, description: 'The topic for the quiz' },
          count: { type: SchemaType.NUMBER, description: 'Number of enigmas to generate (3-7)' },
          locale: { type: SchemaType.STRING, description: 'Language: es or en' },
        },
        required: ['topic'],
      },
    },
    async execute(args) {
      const result = await generateQuiz(provider, {
        prompt: String(args.topic),
        locale: String(args.locale || 'es'),
        count: Number(args.count) || 3,
      })
      return result.enigmas.map((e, i) => `${i + 1}. **${e.title}** (+${e.xp} XP)\n   ${e.description}`).join('\n')
    },
  })

  registerTool('generate_image', {
    declaration: {
      name: 'generate_image',
      description: 'Generate an image for a mission, badge, avatar or cover. Use when the teacher asks to create or generate an image.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          description: { type: SchemaType.STRING, description: 'Description of the image to generate' },
          type: { type: SchemaType.STRING, description: 'Type: narratives, badges, avatars, covers' },
        },
        required: ['description'],
      },
    },
    async execute(args) {
      const result = await generateImage(provider, {
        prompt: String(args.description),
        locale: 'es',
        type: (args.type && typeof args.type === 'string' ? args.type : 'covers') as 'narratives' | 'badges' | 'avatars' | 'covers',
      })
      return `Imagen generada: ${result.fileUrl}`
    },
  })

  registerTool('create_class', {
    declaration: {
      name: 'create_class',
      description: 'Create a new class for the teacher. Use when the teacher asks to create a class, course or subject. Always confirm the class name with the teacher before creating.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING, description: 'Name of the class to create' },
          description: { type: SchemaType.STRING, description: 'Optional description of the class' },
          schedule: { type: SchemaType.STRING, description: 'Optional schedule (e.g. "Lunes y Miércoles 10:00-12:00")' },
        },
        required: ['name'],
      },
    },
    async execute(args) {
      // userId is injected at call time via the tool executor closure in ai.service.ts
      const userId = (args as Record<string, unknown>)._userId as string | undefined
      if (!userId) return 'Error: no se pudo identificar al profesor. Inicia sesion de nuevo.'

      const name = String(args.name || '').trim()
      if (!name || name.length < 2 || name.length > 200) {
        return 'Error: el nombre de la clase debe tener entre 2 y 200 caracteres.'
      }

      const invitationCode = nanoid(6).toUpperCase()
      try {
        const cls = await prisma.class.create({
          data: {
            name,
            narrative: args.description ? String(args.description).trim().slice(0, 500) : undefined,
            schedule: args.schedule ? String(args.schedule).trim().slice(0, 200) : undefined,
            teacherId: userId,
            invitationCode,
          },
        })
        return `Clase "${cls.name}" creada con codigo de invitacion: **${cls.invitationCode}**`
      } catch {
        return 'Error: no se pudo crear la clase. Es posible que ya exista una con ese nombre.'
      }
    },
  })

  registerTool('list_classes', {
    declaration: {
      name: 'list_classes',
      description: 'List the teacher\'s current classes with student counts. Use when the teacher asks about their classes.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {},
      },
    },
    async execute(args) {
      const userId = (args as Record<string, unknown>)._userId as string | undefined
      if (!userId) return 'Error: no se pudo identificar al profesor.'

      const classes = await prisma.class.findMany({
        where: { teacherId: userId },
        include: { _count: { select: { enrollments: { where: { isPreview: false } }, missions: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })

      if (classes.length === 0) return 'No tienes clases creadas todavia.'

      return classes.map(c =>
        `- **${c.name}** (${c._count.enrollments} alumnos, ${c._count.missions} misiones, codigo: ${c.invitationCode})`
      ).join('\n')
    },
  })
}
