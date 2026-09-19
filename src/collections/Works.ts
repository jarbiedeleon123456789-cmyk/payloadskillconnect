import type { CollectionConfig } from 'payload'

export const Works: CollectionConfig = {
  slug: 'works',
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'worker',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      filterOptions: {
        role: {
          equals: 'worker',
        },
      },
    },
    {
      name: 'caption',
      type: 'text',
    },
    {
      name: 'image',
      type: 'relationship',
      relationTo: 'media',
    },
    {
      name: 'facebookStatus',
      type: 'text',
    },
    {
      name: 'facebookPostId',
      type: 'text',
    },
  ],
}
