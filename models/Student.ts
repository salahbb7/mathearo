import mongoose, { Schema, Document } from 'mongoose';

export interface IStudent extends Document {
    name: string;
    grade: string;
    teacherId: mongoose.Types.ObjectId;
}

const StudentSchema = new Schema<IStudent>({
    name: { type: String, required: true },
    grade: { type: String, required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
}, { timestamps: true });

export default mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);
