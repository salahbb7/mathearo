import mongoose, { Schema, Document } from 'mongoose';

export interface ITeacher extends Document {
    name: string;
    email: string;
    password?: string;
    role: 'superadmin' | 'teacher';
    isActive: boolean;
    plan: 'test' | 'pro';
}

const TeacherSchema = new Schema<ITeacher>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['superadmin', 'teacher'], default: 'teacher' },
    isActive: { type: Boolean, default: true },
    plan: { type: String, enum: ['test', 'pro'], default: 'test' },
}, { timestamps: true });

delete mongoose.models.Teacher;
export default mongoose.model<ITeacher>('Teacher', TeacherSchema);
