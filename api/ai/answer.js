import { createAnswerHandler } from "../../server/answer-handler.js";
// Neither the request nor PDF content can override these server dependencies or the quota gate.
export default createAnswerHandler();
