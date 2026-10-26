import mongoose from 'mongoose'

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Item title is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['lost', 'found'],
      required: true,
    },
    status: {
      type: String,
      enum: ['lost', 'found', 'recovered'],
      default: function () {
        return this.type === 'lost' ? 'lost' : 'found'
      },
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
    },
    holdingLocation: {
      type: String,
      default: '',
      trim: true,
    },
    verificationQuestion: {
      type: String,
      default: '',
      trim: true,
    },
    reward: {
      type: String,
      default: '',
      trim: true,
    },
    contactHint: {
      type: String,
      default: '',
      trim: true,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    isSample: {
      type: Boolean,
      default: false,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reportedBy: {
      type: String,
      default: 'Anonymous Student',
    },
  },
  {
    timestamps: true,
  }
)

export const Item = mongoose.model('Item', itemSchema)
