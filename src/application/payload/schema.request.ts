import type { Bibliografia } from "../../domain/input/bibliografia";
import type { KickOff } from "../../domain/input/kick_off";
import type { Silabus } from "../../domain/input/silabus";

export interface SchemaPayload{
    silabus: Silabus
    bibliografia: Bibliografia[]
    kickoff: KickOff
}