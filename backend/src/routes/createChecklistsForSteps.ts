export async function createChecklistsForSteps(prisma: any, orderItemId: string, templates: any[]) {
  const steps = await prisma.productionStep.findMany({ where: { orderItemId } });
  const checklistData: any[] = [];
  for (const step of steps) {
    if (step.stepTemplateId) {
      const template = templates.find((t: any) => t.id === step.stepTemplateId);
      if (template && template.checklistItems && template.checklistItems.length > 0) {
        template.checklistItems.forEach((ci: any) => {
          checklistData.push({
            text: ci.text,
            isMandatory: ci.isMandatory,
            isChecked: step.status === 'COMPLETED',
            productionStepId: step.id
          });
        });
      }
    }
  }
  if (checklistData.length > 0) {
    await prisma.checklistItem.createMany({ data: checklistData });
  }
}
