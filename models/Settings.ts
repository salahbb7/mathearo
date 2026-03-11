import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
    teacherId: mongoose.Types.ObjectId;
    successSoundUrl?: string;
    errorSoundUrl?: string;
}

const SettingsSchema = new Schema<ISettings>({
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, unique: true },
    successSoundUrl: { type: String },
    errorSoundUrl: { type: String },
}, { timestamps: true });

export default mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);
