import mongoose, { Schema, Document } from 'mongoose';

export interface IClassGroup extends Document {
    name: string;
    teacherId: mongoose.Types.ObjectId;
}

const ClassGroupSchema = new Schema<IClassGroup>({
    name: { type: String, required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
}, { timestamps: true });

export default mongoose.models.ClassGroup || mongoose.model<IClassGroup>('ClassGroup', ClassGroupSchema);
