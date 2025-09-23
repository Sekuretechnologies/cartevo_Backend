import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;

    return next.handle().pipe(
      map((response: any) => {
        // n'applique le format que pour GET
        if (method !== "GET") {
          return response; // on renvoie brut pour POST/PUT/DELETE
        }

        const isPaginated = response?.data && response?.pagination;
        let data = response?.data ?? response;

        return {
          status: "success",
          message: response?.message ?? "",
          data,
          count: Array.isArray(data) ? data.length : 1,
          pagination: isPaginated
            ? response.pagination
            : {
                page: 1,
                numberPerPage: Array.isArray(data) ? data.length : 1,
                totalPages: 1,
              },
        };
      })
    );
  }
}
