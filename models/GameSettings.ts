import mongoose, { Schema, Document } from 'mongoose';

export interface IGameSettings extends Document {
    successSoundUrl: string;
    errorSoundUrl: string;
    backgroundMusicUrl: string;
    backgroundMusicVolume: number;
    difficulty: 'easy' | 'medium' | 'hard';
    whatsappNumber: string;
    updatedAt: Date;
}

const GameSettingsSchema = new Schema<IGameSettings>({
    successSoundUrl: {
        type: String,
        default: '',
    },
    errorSoundUrl: {
        type: String,
        default: '',
    },
    backgroundMusicUrl: {
        type: String,
        default: '',
    },
    backgroundMusicVolume: {
        type: Number,
        default: 50,
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium',
    },
    whatsappNumber: {
        type: String,
        default: '96871776166',
    },
}, {
    timestamps: true,
});

export default mongoose.models.GameSettings || mongoose.model<IGameSettings>('GameSettings', GameSettingsSchema);
