import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'name',
  },
  auth: true,
  access: {
    read: () => true,
    create: () => true,
    update: ({ req }) => Boolean(req.user),
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        if (!data || !originalDoc || !req.user) {
          return data
        }

        if (req.user.role !== 'admin' && String(req.user.id) !== String(originalDoc.id)) {
          throw new Error('You may only update your own profile.')
        }

        if (req.user.role === 'admin') {
          return data
        }

        data.role = originalDoc.role
        data.verified = originalDoc.verified

        return data
      },
    ],
    beforeValidate: [
      async ({ data, operation, req }) => {
        if (!data || operation !== 'create') {
          return data
        }

        const existingUsers = await req.payload.find({
          collection: 'users',
          depth: 0,
          limit: 1,
          overrideAccess: true,
        })

        if (existingUsers.totalDocs === 0) {
          data.role = 'admin'
        } else if (!req.user) {
          data.role = data.role === 'worker' ? 'worker' : 'customer'
        } else if (!data.role) {
          data.role = 'customer'
        }
        data.verified = false

        return data
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'customer',
      options: [
        { label: 'Customer', value: 'customer' },
        { label: 'Worker', value: 'worker' },
        { label: 'Admin', value: 'admin' },
      ],
    },
    {
      name: 'barangay',
      type: 'select',
      options: [
        'Guinobatan',
        'Camansihan',
        'Bayanan I',
        'Lumangbayan',
        'Sta. Isabel',
        'San Vicente',
      ],
    },
    {
      name: 'phone',
      type: 'text',
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
      name: 'skillCategory',
      type: 'select',
      options: [
        'Electronics',
        'Appliance Repair',
        'Electrical',
        'Welding',
        'Plumbing',
        'Small Engine Repair',
      ],
    },
    {
      name: 'verified',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'rating',
      type: 'number',
      min: 0,
      max: 5,
      defaultValue: 0,
    },
    {
      name: 'ratingCount',
      type: 'number',
      min: 0,
      defaultValue: 0,
    },
    {
      name: 'jobs',
      type: 'number',
      min: 0,
      defaultValue: 0,
    },
    {
      name: 'availability',
      type: 'select',
      defaultValue: 'offline',
      options: [
        { label: 'Available', value: 'available' },
        { label: 'Busy', value: 'busy' },
        { label: 'Offline', value: 'offline' },
      ],
    },
    {
      name: 'bio',
      type: 'textarea',
    },
    {
      name: 'rateMin',
      type: 'number',
      min: 0,
    },
    {
      name: 'rateMax',
      type: 'number',
      min: 0,
    },
    {
      name: 'facebookUrl',
      type: 'text',
    },
    {
      name: 'profileImage',
      type: 'relationship',
      relationTo: 'media',
    },
  ],
}
