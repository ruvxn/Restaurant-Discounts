import { z } from 'zod';

const isoDateRegex = /^(\d{4})-(\d{2})-(\d{2})/;

export const menuItemInputSchema = z.object({
  menuItemId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(20),
  notes: z
    .string()
    .trim()
    .max(500, { message: 'Notes cannot exceed 500 characters' })
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
});

export const createBookingSchema = z.object({
  restaurantId: z.coerce.number().int().positive(),
  bookingDate: z
    .string()
    .regex(isoDateRegex, { message: 'bookingDate must be an ISO date string' })
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: 'bookingDate must be a valid date',
    }),
  bookingTime: z.coerce.number().int().min(0).max(23),
  partySize: z.coerce.number().int().min(1).max(20),
  menuItems: z.array(menuItemInputSchema).max(50).optional().default([]),
});

export const updateBookingSchema = z
  .object({
    partySize: z.coerce.number().int().min(1).max(20).optional(),
    bookingDate: z
      .string()
      .regex(isoDateRegex, { message: 'bookingDate must be an ISO date string' })
      .refine((value) => !Number.isNaN(Date.parse(value)), {
        message: 'bookingDate must be a valid date',
      })
      .optional(),
    bookingTime: z.coerce.number().int().min(0).max(23).optional(),
    menuItems: z
      .array(
        menuItemInputSchema.extend({
          quantity: z.coerce.number().int().min(0).max(20),
        })
      )
      .optional(),
  })
  .refine(
    (data) =>
      data.partySize !== undefined ||
      data.bookingTime !== undefined ||
      data.bookingDate !== undefined ||
      data.menuItems !== undefined,
    {
      message: 'At least one field (partySize, bookingDate, bookingTime, menuItems) must be provided',
      path: ['root'],
    }
  );
