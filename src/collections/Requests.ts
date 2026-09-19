import type { Access, CollectionConfig, Where } from 'payload'

const canReadRequests: Access = ({ req }): boolean | Where => {
  const user = req.user

  if (!user) {
    return false
  }

  if (user.role === 'admin') {
    return true
  }

  if (user.role === 'customer') {
    return {
      customer: {
        equals: user.id,
      },
    }
  }

  if (user.role === 'worker') {
    if (!user.skillCategory) {
      return {
        worker: {
          equals: user.id,
        },
      }
    }

    return {
      or: [
        {
          worker: {
            equals: user.id,
          },
        },
        {
          and: [
            {
              status: {
                equals: 'pending',
              },
            },
            {
              skillNeeded: {
                equals: user.skillCategory,
              },
            },
          ],
        },
      ],
    }
  }

  return false
}

const canUpdateRequests: Access = ({ req }): boolean | Where => {
  if (!req.user) {
    return false
  }

  if (req.user.role === 'admin') {
    return true
  }

  if (req.user.role === 'worker') {
    return {
      or: [
        {
          worker: {
            equals: req.user.id,
          },
        },
        {
          and: [
            {
              status: {
                equals: 'pending',
              },
            },
            {
              skillNeeded: {
                equals: req.user.skillCategory,
              },
            },
          ],
        },
      ],
    }
  }

  if (req.user.role === 'customer') {
    return {
      customer: {
        equals: req.user.id,
      },
    }
  }

  return false
}

export const Requests: CollectionConfig = {
  slug: 'requests',
  access: {
    read: canReadRequests,
    create: ({ req }) => req.user?.role === 'customer' || req.user?.role === 'admin',
    update: canUpdateRequests,
    delete: ({ req }) => req.user?.role === 'admin',
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        if (!data || operation !== 'update' || req.user?.role !== 'customer' || !originalDoc) {
          return data
        }

        const changedFields = Object.keys(data)
        const allowedFields = ['rating', 'status']
        const hasOnlyAllowedFields = changedFields.every((field) => allowedFields.includes(field))

        if (!hasOnlyAllowedFields) {
          throw new Error('Customers may only rate completed requests or cancel pending requests.')
        }

        if (data.status && (data.status !== 'cancelled' || originalDoc.status !== 'pending')) {
          throw new Error('Only pending requests can be cancelled by customers.')
        }

        if (data.rating !== undefined && originalDoc.status !== 'completed') {
          throw new Error('Only completed requests can be rated by customers.')
        }

        return data
      },
    ],
    beforeValidate: [
      async ({ data, operation, req }) => {
        if (!data) {
          return data
        }

        if (operation === 'create' && req.user?.role === 'customer') {
          data.customer = req.user.id
          data.customerName = req.user.name || req.user.email
        }

        if (operation === 'create' && !data.ticketId) {
          data.ticketId = `SC-${Date.now().toString().slice(-6)}`
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'ticketId',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'customerName',
      type: 'text',
    },
    {
      name: 'barangay',
      type: 'text',
    },
    {
      name: 'contactNumber',
      type: 'text',
    },
    {
      name: 'skillNeeded',
      type: 'text',
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'preferredDate',
      type: 'date',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Working', value: 'working' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
    {
      name: 'worker',
      type: 'relationship',
      relationTo: 'users',
      filterOptions: {
        role: {
          equals: 'worker',
        },
      },
    },
    {
      name: 'workerName',
      type: 'text',
    },
    {
      name: 'rating',
      type: 'number',
      min: 0,
      max: 5,
    },
    {
      name: 'lat',
      type: 'number',
    },
    {
      name: 'lng',
      type: 'number',
    },
    {
      name: 'photos',
      type: 'relationship',
      relationTo: 'media',
      hasMany: true,
    },
  ],
}
