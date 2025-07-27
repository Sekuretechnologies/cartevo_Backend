import { PrismaClient } from '@prisma/client';
import fnOutput from '@/utils/shared/fnOutputHandler';

const prisma = new PrismaClient();

class SyncmetadataModel {
  static async getOne(filters: { [key: string]: any }) {
    try {
      const result = await prisma.syncmetadata.findFirst({
        where: filters,
      });
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: 'Error fetching syncmetadata: ' + error.message,
        error: { message: 'Error fetching syncmetadata: ' + error.message },
      });
    }
  }

  static async create(data: any) {
    try {
      const result = await prisma.syncmetadata.create({ data });
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: 'Error creating syncmetadata: ' + error.message,
        error: { message: 'Error creating syncmetadata: ' + error.message },
      });
    }
  }

  static async update(id: any, data: any) {
    try {
      const result = await prisma.syncmetadata.update({
        where: { id },
        data,
      });
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: 'Error updating syncmetadata: ' + error.message,
        error: { message: 'Error updating syncmetadata: ' + error.message },
      });
    }
  }

  static async delete(id: any) {
    try {
      const result = await prisma.syncmetadata.delete({
        where: { id },
      });
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: 'Error deleting syncmetadata: ' + error.message,
        error: { message: 'Error deleting syncmetadata: ' + error.message },
      });
    }
  }
}

export default SyncmetadataModel;
