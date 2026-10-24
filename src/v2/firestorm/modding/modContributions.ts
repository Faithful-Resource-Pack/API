import firestorm from "firestorm-db";
import { FirestormModContribution } from "../../interfaces";
import "../config";

export const modContributions = firestorm.collection<FirestormModContribution>("mod_contributions");
