// This file has been generated by Specta. DO NOT EDIT.

export type AlmanaxReward = { name: string; quantity: number; kamas: number; experience: number; bonus: string; img: string | null }

export type AutoPilot = { name: string; position: string }

export type Conf = { autoTravelCopy: boolean; showDoneGuides: boolean; lang?: ConfLang; fontSize?: FontSize; profiles: Profile[]; profileInUse: string; autoPilots: AutoPilot[]; notes: Note[]; opacity: number }

export type ConfLang = "En" | "Fr" | "Es" | "Pt"

export type ConfStep = { checkboxes: number[] }

export type Folder = { name: string }

export type FontSize = "ExtraSmall" | "Small" | "Normal" | "Large" | "ExtraLarge"

export type Guide = { id: number; name: string; status: Status; likes: number; dislikes: number; downloads: number | null; created_at: string; deleted_at: string | null; updated_at: string | null; lang: GuideLang; order: number; user: User; user_id: number; description: string | null; web_description: string | null }

export type GuideLang = "en" | "fr" | "es" | "pt"

export type GuideStep = { name: string | null; map: string | null; pos_x: number; pos_y: number; web_text: string }

export type GuideWithSteps = { id: number; name: string; description: string | null; status: Status; likes: number; dislikes: number; downloads: number | null; deleted_at: string | null; updated_at: string | null; lang: GuideLang; order: number; user: User; web_description: string | null; steps: GuideStep[] }

export type Guides = { guides: GuideWithSteps[] }

export type GuidesOrFolder = ({ type: "guide" } & GuideWithSteps) | ({ type: "folder" } & Folder)

export type IsOld = { from: string; to: string; isOld: boolean }

export type Note = { name: string; text: string }

export type Profile = { id: string; name: string; progresses: Progress[] }

export type Progress = { id: number; currentStep: number; steps: { [key in number]: ConfStep } }

export type Status = "draft" | "public" | "private" | "certified" | "gp"

export type TauRpcAlmanaxApiInputTypes = { proc_name: "get"; input_type: null }

export type TauRpcAlmanaxApiOutputTypes = { proc_name: "get"; output_type: AlmanaxReward }

export type TauRpcApiInputTypes = { proc_name: "isAppVersionOld"; input_type: null }

export type TauRpcApiOutputTypes = { proc_name: "isAppVersionOld"; output_type: IsOld }

export type TauRpcBaseApiInputTypes = { proc_name: "newId"; input_type: null } | { proc_name: "openUrl"; input_type: { __taurpc_type: string } }

export type TauRpcBaseApiOutputTypes = { proc_name: "newId"; output_type: string } | { proc_name: "openUrl"; output_type: null }

export type TauRpcConfApiInputTypes = { proc_name: "get"; input_type: null } | { proc_name: "set"; input_type: { __taurpc_type: Conf } } | { proc_name: "toggleGuideCheckbox"; input_type: [number, number, number] } | { proc_name: "reset"; input_type: null }

export type TauRpcConfApiOutputTypes = { proc_name: "get"; output_type: Conf } | { proc_name: "set"; output_type: null } | { proc_name: "toggleGuideCheckbox"; output_type: number } | { proc_name: "reset"; output_type: null }

export type TauRpcGuidesApiInputTypes = { proc_name: "getFlatGuides"; input_type: { __taurpc_type: string } } | { proc_name: "getGuides"; input_type: { __taurpc_type: string | null } } | { proc_name: "getGuideFromServer"; input_type: { __taurpc_type: number } } | { proc_name: "getGuidesFromServer"; input_type: { __taurpc_type: Status } } | { proc_name: "downloadGuideFromServer"; input_type: [number, string] } | { proc_name: "openGuidesFolder"; input_type: null }

export type TauRpcGuidesApiOutputTypes = { proc_name: "getFlatGuides"; output_type: GuideWithSteps[] } | { proc_name: "getGuides"; output_type: GuidesOrFolder[] } | { proc_name: "getGuideFromServer"; output_type: GuideWithSteps } | { proc_name: "getGuidesFromServer"; output_type: Guide[] } | { proc_name: "downloadGuideFromServer"; output_type: Guides } | { proc_name: "openGuidesFolder"; output_type: null }

export type TauRpcImageApiInputTypes = { proc_name: "fetchImage"; input_type: { __taurpc_type: string } }

export type TauRpcImageApiOutputTypes = { proc_name: "fetchImage"; output_type: number[] }

export type TauRpcSecurityApiInputTypes = { proc_name: "getWhiteList"; input_type: null }

export type TauRpcSecurityApiOutputTypes = { proc_name: "getWhiteList"; output_type: string[] }

export type TauRpcUpdateApiInputTypes = { proc_name: "startUpdate"; input_type: null }

export type TauRpcUpdateApiOutputTypes = { proc_name: "startUpdate"; output_type: null }

export type User = { id: number; name: string; is_admin: number; is_certified: number }

const ARGS_MAP = {'update':'{"startUpdate":[]}', 'guides':'{"getFlatGuides":["folder"],"downloadGuideFromServer":["guide_id","folder"],"getGuides":["folder"],"getGuidesFromServer":["status"],"getGuideFromServer":["guide_id"],"openGuidesFolder":[]}', 'almanax':'{"get":[]}', 'base':'{"openUrl":["url"],"newId":[]}', 'conf':'{"set":["conf"],"toggleGuideCheckbox":["guide_id","step_index","checkbox_index"],"get":[],"reset":[]}', '':'{"isAppVersionOld":[]}', 'security':'{"getWhiteList":[]}', 'image':'{"fetchImage":["url"]}'}
import { createTauRPCProxy as createProxy } from "taurpc"

export const createTauRPCProxy = () => createProxy<Router>(ARGS_MAP)

type Router = {
	'base': [TauRpcBaseApiInputTypes, TauRpcBaseApiOutputTypes],
	'almanax': [TauRpcAlmanaxApiInputTypes, TauRpcAlmanaxApiOutputTypes],
	'guides': [TauRpcGuidesApiInputTypes, TauRpcGuidesApiOutputTypes],
	'': [TauRpcApiInputTypes, TauRpcApiOutputTypes],
	'security': [TauRpcSecurityApiInputTypes, TauRpcSecurityApiOutputTypes],
	'image': [TauRpcImageApiInputTypes, TauRpcImageApiOutputTypes],
	'update': [TauRpcUpdateApiInputTypes, TauRpcUpdateApiOutputTypes],
	'conf': [TauRpcConfApiInputTypes, TauRpcConfApiOutputTypes],
}