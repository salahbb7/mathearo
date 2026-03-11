import mongoose, { Schema, Document } from 'mongoose';

export interface IGameMeta extends Document {
    gameId: string;
    imageUrl: string;
    updatedAt: Date;
}

const GameMetaSchema = new Schema<IGameMeta>(
    {
        gameId: { type: String, required: true, unique: true },
        imageUrl: { type: String, default: '' },
    },
    { timestamps: true }
);

export default mongoose.models.GameMeta ||
    mongoose.model<IGameMeta>('GameMeta', GameMetaSchema);

