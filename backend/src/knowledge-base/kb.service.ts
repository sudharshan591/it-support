import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { AuditService } from '../audit/audit.service';

const parseTags = (tags: string): string[] => {
  try { return JSON.parse(tags); } catch { return []; }
};

const withParsedTags = <T extends { tags: string }>(article: T) => ({
  ...article,
  tags: parseTags(article.tags),
});

@Injectable()
export class KbService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(dto: CreateArticleDto, authorId: string) {
    const { tags, ...rest } = dto as any;
    const article = await this.prisma.kbArticle.create({
      data: { ...rest, tags: JSON.stringify(tags ?? []), authorId },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });
    await this.auditService.log({ userId: authorId, action: 'create', resource: 'kb', resourceId: article.id, newValues: { title: article.title } });
    return withParsedTags(article);
  }

  async findAll(query: { page?: number; limit?: number; search?: string; category?: string; isPublished?: boolean; isAdmin?: boolean }) {
    const { page = 1, limit = 20, search, category, isPublished, isAdmin } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (!isAdmin) where.isPublished = true;
    else if (isPublished !== undefined) where.isPublished = isPublished;

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { tags: { contains: search } },
      ];
    }
    if (category) where.category = { contains: category };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.kbArticle.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isPublished: 'desc' }, { viewCount: 'desc' }],
        select: {
          id: true, title: true, category: true, tags: true,
          isPublished: true, viewCount: true, createdAt: true, updatedAt: true,
          author: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.kbArticle.count({ where }),
    ]);

    const categories = await this.prisma.kbArticle.findMany({
      where: { deletedAt: null, isPublished: true },
      select: { category: true },
      distinct: ['category'],
    });

    return {
      data: data.map(withParsedTags),
      categories: categories.map(c => c.category),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, isAdmin: boolean) {
    const article = await this.prisma.kbArticle.findFirst({
      where: { id, deletedAt: null, ...(isAdmin ? {} : { isPublished: true }) },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!article) throw new NotFoundException('Article not found');

    await this.prisma.kbArticle.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    return withParsedTags(article);
  }

  async update(id: string, dto: Partial<CreateArticleDto>, actorId: string) {
    const article = await this.prisma.kbArticle.findFirst({ where: { id, deletedAt: null } });
    if (!article) throw new NotFoundException('Article not found');

    const { tags, ...rest } = dto as any;
    const data: any = { ...rest };
    if (tags !== undefined) data.tags = JSON.stringify(tags);

    const updated = await this.prisma.kbArticle.update({
      where: { id },
      data,
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });
    await this.auditService.log({ userId: actorId, action: 'update', resource: 'kb', resourceId: id, newValues: dto });
    return withParsedTags(updated);
  }

  async remove(id: string, actorId: string) {
    const article = await this.prisma.kbArticle.findFirst({ where: { id, deletedAt: null } });
    if (!article) throw new NotFoundException('Article not found');
    await this.prisma.kbArticle.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.auditService.log({ userId: actorId, action: 'delete', resource: 'kb', resourceId: id });
  }

  async getPopular(limit: number = 5) {
    return this.prisma.kbArticle.findMany({
      where: { isPublished: true, deletedAt: null },
      orderBy: { viewCount: 'desc' },
      take: limit,
      select: { id: true, title: true, category: true, viewCount: true },
    });
  }
}
