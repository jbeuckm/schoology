"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
jest.mock('axios');
const index_1 = __importDefault(require("./index"));
const TEST_KEY = 'TEST_KEY';
const TEST_SECRET = 'TEST_SECRET';
let api;
describe('SchoologyAPI', () => {
    beforeEach(() => {
        api = new index_1.default(TEST_KEY, TEST_SECRET);
    });
    test('getAuthHeaderComponents', () => __awaiter(void 0, void 0, void 0, function* () {
        const headers = api.getAuthHeaderComponents();
        expect(headers.oauth_consumer_key).toEqual(TEST_KEY);
    }));
    test('getRequestToken', () => __awaiter(void 0, void 0, void 0, function* () {
        axios_1.default.mockImplementationOnce(() => Promise.resolve({ data: 'token=🔑' }));
        yield expect(api.getRequestToken()).resolves.toEqual({ token: '🔑' });
        expect(axios_1.default).toHaveBeenCalledWith(expect.objectContaining({
            method: 'get',
            url: 'https://api.schoology.com/v1/oauth/request_token',
            headers: expect.objectContaining({
                Authorization: expect.stringContaining(TEST_KEY),
            }),
        }));
    }));
});
//# sourceMappingURL=SchoologySPI.spec.js.map