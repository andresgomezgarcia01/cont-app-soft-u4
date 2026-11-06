
import {
    InvalidParameterError,
    InvalidPaginationTokenError,
    ItemNotFoundError
} from "../../common/errors.mjs";
import {
    deserializeItem,
    deserializeItems
} from "../../common/serialization.mjs";

export class VolcanoService {
    constructor(repository) {
        this.repository = repository;
    }

    async getAll({ limit = 25, nextToken = undefined } = {}) {
        const parsedLimit = limit === undefined ? 25 : Number(limit);

        if (
            !Number.isInteger(parsedLimit) ||
            parsedLimit < 1 ||
            parsedLimit > 100
        ) {
            throw new InvalidParameterError(
                "The limit must be an integer between 1 and 100."
            );
        }

        const exclusiveStartKey = nextToken
            ? this.decodeToken(nextToken)
            : undefined;

        const result = await this.repository.findAll(
            parsedLimit,
            exclusiveStartKey
        );

        return {
            data: deserializeItems(result.items),
            page: {
                limit: parsedLimit,
                next_token: result.lastEvaluatedKey
                    ? this.encodeToken(result.lastEvaluatedKey)
                    : null
            }
        };
    }

    async getById(id) {
        const parsedId =
            typeof id === "string" && /^\d+$/.test(id)
                ? Number(id)
                : typeof id === "number" && Number.isSafeInteger(id)
                    ? id
                    : NaN;

        if (!Number.isInteger(parsedId) || parsedId < 1) {
            throw new InvalidParameterError(
                "The id must be an integer greater than or equal to 1."
            );
        }

        const item = await this.repository.findById(parsedId);

        if (!item) {
            throw new ItemNotFoundError();
        }

        return { data: deserializeItem(item) };
    }

    encodeToken(key) {
        return Buffer.from(JSON.stringify(key)).toString("base64url");
    }


    decodeToken(token) {
        try {
            if (
                typeof token !== "string" ||
                token.length === 0 ||
                !/^[A-Za-z0-9_-]+$/.test(token)
            ) {
                throw new Error("Invalid token format");
            }

            const decoded = Buffer.from(token, "base64url").toString("utf8");

            const key = JSON.parse(decoded);

            if (
                !key ||
                typeof key !== "object" ||
                Array.isArray(key) ||
                Object.keys(key).length !== 1 ||
                !key.Volcano_Number ||
                typeof key.Volcano_Number.N !== "string" ||
                !/^\d+$/.test(key.Volcano_Number.N) ||
                Number(key.Volcano_Number.N) < 1
            ) {
                throw new Error("Invalid pagination key");
            }

            return key;
        } catch {
            throw new InvalidPaginationTokenError();
        }
    }

}
